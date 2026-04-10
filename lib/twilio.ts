import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!_client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error("Missing Twilio credentials");
    }
    _client = twilio(accountSid, authToken);
  }
  return _client;
}

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
