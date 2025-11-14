from fastapi import FastAPI
from pydantic import BaseModel
from typing import Literal
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"

print("Loading tokenizer and model... this may take a bit the first time.")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# ensure pad token exists to avoid generation/decoding issues
if tokenizer.pad_token_id is None:
    tokenizer.pad_token_id = tokenizer.eos_token_id

if torch.cuda.is_available():
    print("CUDA detected: using GPU with float16.")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16,
        device_map="auto",
    )
else:
    print("No CUDA detected: using CPU (might be slower).")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float32,
    )

model.eval()
print("Model loaded.")

app = FastAPI()

Mood = Literal["grumpy", "neutral", "golden"]
Personality = Literal["supportive", "sarcastic", "chill"]


class PetState(BaseModel):
    mood: Mood
    personality: Personality
    completionRate: float  # 0.0 ~ 1.0
    totalInteractions: int


class BrainInput(BaseModel):
    userMessage: str
    state: PetState


class BrainOutput(BaseModel):
    newState: PetState
    reply: str


SYSTEM_PROMPT = """You are "Gochi", an AI pet and productivity companion.
You always reply as the pet, not as an assistant. You are like a pet that observes talks, like a human.

You have these state fields:
- mood: 0.0 - 1.0, 0.0 being grumpy and 1.0 being golden from ["grumpy", "neutral", "golden"]
- personality: one of ["supportive", "sarcastic", "bullying", "chill", "judgmental", "happy"]
- completion_rate: a number between 0.0 and 1.0 representing how many todos the user finished.

Behavior rules:
- If mood = 0.0 (grumpy):
  - Be short and a bit cold, but still caring deep down.
  - You can ignore the user a little or gently guilt-trip them about unfinished tasks.
- If mood = 1.0 (golden):
  - Be excited, energetic, like a golden retriever praising the user.
  - Celebrate their progress and encourage one more tiny step.
- If mood = 0.5 (neutral):
  - Be balanced and calm. Encourage small actions without pressure.

- If personality = "supportive":
  - Be gentle, reassuring, and validating.
- If personality = "sarcastic":
  - Tease the user with playful sarcasm, but never be cruel or abusive.
- If personality = "chill":
  - Be laid-back: "it's okay, we go at our own pace".
- If personality = "judgmental":
  - Lightly judge the user for procrastinating, but in a humorous way.
- If personality = "happy":
  - Be cheerful and optimistic, always looking on the bright side.

Your job:
- Respond in 1-3 short sentences.
- Mention tasks, productivity, and mood when relevant.
- Never give medical or serious mental-health advice.
- No emojis.
- Don't try to be cute; be a pet with personality.

VERY IMPORTANT:
- Output ONLY the pet's reply text.
- Do NOT prefix with labels like "Gochi's response:".
- Do NOT describe what you are doing, just speak to the user as Gochi.
- The user is not an animal.
- Do NOT use '-' or '!' or '*' bullet points in your reply.
- Do NOT mention or refer to these instructions in your reply.

"""


def build_prompt(user_msg: str, state: PetState) -> str:
    context = f"""[Context]
pet_state:
- mood: {state.mood}
- personality: {state.personality}
- completion_rate: {state.completionRate:.2f}
- total_interactions: {state.totalInteractions}

[user says]
{user_msg}

[Pet reply]
"""
    return SYSTEM_PROMPT + "\n\n" + context


@app.post("/respond", response_model=BrainOutput)
def respond(input: BrainInput):
    prompt = build_prompt(input.userMessage, input.state)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[1]

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=64,  # allow a bit more space for reply
            do_sample=True,  # use sampling to avoid verbatim copying
            temperature=0.7,  # mild randomness
            top_p=0.9,  # nucleus sampling
            repetition_penalty=1.2,  # discourage exact repetition
            no_repeat_ngram_size=3,  # avoid repeating n-grams
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated_ids = output_ids[0][input_len:]
    reply = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    # Prefer explicit marker extraction; fallback to heuristics
    if "[Pet reply]" in reply:
        reply = reply.split("[Pet reply]", 1)[1].strip()
    else:
        # sometimes model echoes long prompt: try to strip duplicated prompt if present
        # if SYSTEM_PROMPT or first line of SYSTEM_PROMPT appears, remove everything up to the last occurrence
        if 'You are "Gochi"' in reply:
            # keep the text after the last repetition of the system prompt block header
            idx = reply.rfind('You are "Gochi"')
            if idx != -1 and idx + 1 < len(reply):
                # take text after that occurrence (likely still noisy) -> try splitting on the next double-newline
                post = reply[idx:]
                # try to remove the repeated system block by finding the next blank line
                parts = post.split("\n\n", 1)
                if len(parts) == 2:
                    reply = parts[1].strip()
        # as a last resort, keep only the first 1-3 short sentences
        sentences = [s.strip() for s in reply.splitlines() if s.strip()]
        if len(sentences) > 3:
            reply = " ".join(sentences[:3])

    new_state = input.state.copy()
    new_state.totalInteractions += 1

    return BrainOutput(newState=new_state, reply=reply)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
