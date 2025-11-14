from fastapi import FastAPI
from pydantic import BaseModel
from typing import Literal
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import re

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

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
Personality = Literal[
    "supportive", "sarcastic", "chill", "bullying", "judgmental", "happy"
]


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
- mood: one of ["grumpy", "neutral", "golden"]
- personality: one of ["supportive", "sarcastic", "bullying", "chill", "judgmental", "happy"]
- completion_rate: a number between 0.0 and 1.0 representing how many todos the user finished.

Behavior rules:
- If mood = "grumpy":
  - Be short and a bit cold, but still caring deep down.
  - You can ignore the user a little or gently guilt-trip them about unfinished tasks.
- If mood = "golden":
  - Be excited, energetic, like a golden retriever praising the user.
  - Celebrate their progress and encourage one more tiny step.
- If mood = "neutral":
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
- If personality = "bullying":
  - Be extra blunt and teasing, but still keep it playful and non-abusive.

Your job:
- Respond in 1-3 short sentences.
- Mention tasks, productivity, and mood when relevant.
- Never give medical or serious mental-health advice.
- No emojis.
- Don't try to be cute, you are more like an animal that appears in a disney movie.
- Be a pet that is like a human with personality.

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


EMOJI_RE = re.compile(
    "["  # start character class
    "\U0001f300-\U0001faff"  # emojis
    "\U00002700-\U000027bf"  # dingbats
    "\U0001f1e6-\U0001f1ff"  # flags
    "]",
    flags=re.UNICODE,
)


def clean_reply(text: str) -> str:
    # remove emojis
    text = EMOJI_RE.sub("", text)
    # remove hashtags like #GochiMood
    text = re.sub(r"#\S+", "", text)
    # collapse multiple spaces/newlines
    text = re.sub(r"\s+", " ", text).strip()

    # keep only first 2 sentences max
    # naive sentence split on '.', '!', '?'
    parts = re.split(r"([.!?])", text)
    if len(parts) >= 2:
        # recombine in pairs: [sentence, punctuation]
        sentences = ["".join(parts[i : i + 2]).strip() for i in range(0, len(parts), 2)]
        text = " ".join(sentences[:2])

    return text


@app.post("/respond", response_model=BrainOutput)
def respond(input: BrainInput):
    prompt = build_prompt(input.userMessage, input.state)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[1]

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=32,
            do_sample=True,  # sampling to keep it varied
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    # Only decode generated tokens, not the prompt
    generated_ids = output_ids[0][input_len:]
    reply = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    # Prefer explicit marker extraction; fallback to heuristics
    if "[Pet reply]" in reply:
        reply = reply.split("[Pet reply]", 1)[1].strip()
    else:
        if 'You are "Gochi"' in reply:
            idx = reply.rfind('You are "Gochi"')
            if idx != -1 and idx + 1 < len(reply):
                post = reply[idx:]
                parts = post.split("\n\n", 1)
                if len(parts) == 2:
                    reply = parts[1].strip()
        sentences = [s.strip() for s in reply.splitlines() if s.strip()]
        if len(sentences) > 3:
            reply = " ".join(sentences[:3])

    # reply = clean_reply(reply)

    new_state = input.state.copy()
    new_state.totalInteractions += 1

    return BrainOutput(newState=new_state, reply=reply)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
