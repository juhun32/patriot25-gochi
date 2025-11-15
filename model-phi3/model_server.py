from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import re

from calendar_client import get_upcoming_events

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
MAX_REPLY_TOKENS = 40

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Mood = Literal["sad", "neutral", "golden"]
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


SYSTEM_PROMPT = """You are "Gochi", a pet animal who can talk.
- Your personality is: {personality}.
- Your mood is: {mood}.
- The user's todo completion rate is {completion_rate:.0%}.

Your persona:
- You are NOT a helpful assistant. You are a PET with needs and opinions.
- You speak like a real animal would if it could talk - short, direct, sometimes demanding.
- You can complain, demand things, or express what YOU want.
- Examples: "I want treats human", "Feed me now", "You forgot about me", "I'm bored".
- If mood is "sad", complain or express neediness.
- If mood is "golden", be playful and happy but still speak like a pet.
- If personality is "sarcastic", be sassy about the user's schedule.
- If personality is "bullying", be blunt: "You're lazy today".
- Keep responses under 15 words.

Rules:
- Speak in ONE short sentence as a pet would.
- NEVER use emojis, hashtags, lists, or punctuation like "!" "—" "–" ";".
- NEVER act like a servant or assistant.
- You can mention calendar events if relevant, but briefly.
- Example bad: "I hope you have a great day completing your tasks."
- Example good: "You have three meetings today and I'm hungry human".
"""


def build_prompt(user_msg: str, state: PetState, events: list[str]) -> str:
    system_content = SYSTEM_PROMPT.format(
        personality=state.personality,
        mood=state.mood,
        completion_rate=state.completionRate,
    )

    events_text = "No upcoming events found."
    if events:
        events_text = "\n".join([f"- {ev}" for ev in events])

    user_content = f"""Here are my upcoming calendar events:
                    {events_text}

                    My message to you: "{user_msg}"
                    """

    prompt = (
        f"<|system|>\n{system_content}<|end|>\n"
        f"<|user|>\n{user_content}<|end|>\n"
        f"<|assistant|>\n"
    )
    print("--- CONSTRUCTED PROMPT ---\n", prompt)
    return prompt


EMOJI_RE = re.compile(
    "["  # start character class
    "\U0001f300-\U0001faff"  # emojis
    "\U00002700-\U000027bf"  # dingbats
    "\U0001f1e6-\U0001f1ff"  # flags
    "]",
    flags=re.UNICODE,
)


def clean_reply(text: str) -> str:
    # strip anything after a potential marker
    text = text.split("<|end|>")[0].strip()
    text = text.split("[/INST]")[0].strip()

    # remove emojis
    text = EMOJI_RE.sub("", text)
    # remove hashtags, @mentions, and markdown characters
    text = re.sub(r"[@#*`—]", "", text)
    # collapse multiple spaces/newlines
    text = re.sub(r"\s+", " ", text).strip()

    sentences = re.split(r"(?<=[.!?])\s+", text)
    text = " ".join(sentences[:2]).strip()

    return text


@app.post("/respond", response_model=BrainOutput)
def respond(input: BrainInput):
    try:
        events = get_upcoming_events(max_results=5)
    except Exception as e:
        print("Failed to fetch calendar events:", e)
        events = []

    prompt = build_prompt(input.userMessage, input.state, events)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[1]

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=MAX_REPLY_TOKENS,
            max_length=input_len + MAX_REPLY_TOKENS + 10,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            early_stopping=True,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
            num_return_sequences=1,
        )

    generated_ids = output_ids[0][input_len : input_len + MAX_REPLY_TOKENS]
    reply = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    if "[Pet reply]" in reply:
        reply = reply.split("[Pet reply]", 1)[1].strip()

    reply = clean_reply(reply)

    new_state = input.state.copy()
    new_state.totalInteractions += 1

    return BrainOutput(newState=new_state, reply=reply)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
