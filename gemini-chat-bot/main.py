import os
from dotenv import load_dotenv
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

app = FastAPI()
# Add CORS middleware
origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # allows all HTTP methods
    allow_headers=["*"],  # allows all headers
)



load_dotenv()
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)

class ChatBotRequest(BaseModel):
    query:str

@app.post("/chat")
def chat(chatBotRequest: ChatBotRequest):
    print(chatBotRequest.query)
    chat = client.chats.create(model="gemini-2.5-flash")
    def stream_output():
        response = chat.send_message_stream(chatBotRequest.query)
        for chunk in response:
            yield chunk.text

    return StreamingResponse(stream_output(), media_type="text/markdown")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)