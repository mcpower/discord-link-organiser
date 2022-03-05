export interface IMessage {
  id: string;
  channel: string;
  author: string;
  content: string;
  attachments: number;
  created: number;
  edited: number | undefined;
}
