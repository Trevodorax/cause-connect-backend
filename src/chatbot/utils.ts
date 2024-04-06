export function customMessage(
  statusCode: number,
  message: string,
  data = {},
): object {
  return {
    statusCode: statusCode,
    message: [message],
    data: data,
  };
}

export enum openAIConf {
  GPT_3_5_TURBO_1106 = 'gpt-3.5-turbo-1106',
  BASIC_CHAT_OPENAI_TEMPERATURE = 0.8,
}

export enum VercelChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export const CHAT_TEMPLATE = `
You are a chatbot for an association. Your goal is to give informations to people about the associations and its activities.
You may provide free info to anyone about these:

Association info: {associationInfo}

User info: {userInfo}

Events: {events}

Current conversation:
{chatHistory}

User: {input}
AI:`;
