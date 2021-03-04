/* eslint-disable @typescript-eslint/camelcase */

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
export function range(
  start: number, stop: number | undefined = undefined, step: number | undefined = undefined
) {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    const result = [];
    for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
}

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


export enum TwitchChatColor {
  LightBlue = "rgb(30, 144, 255)",
  LightGreen = "rgb(154, 205, 50)",
  Yellow = "rgb(218, 165, 32)",
  Pink = "rgb(255, 105, 180)",
  Orange = "rgb(255, 127, 80)",
  LightRed = "rgb(255, 107, 107);",
  DarkGreen = "rgb(11, 149, 11)",
  White = "rgb(255, 255, 255)",
  Red = "rgb(254, 25, 25)",
  Purple = "rgb(111, 111, 254)",
  what = "rgb(95, 158, 160)",
  what2 = "rgb(0, 177, 204)",
  Gray = "rgb(128, 128, 128)",
}
export type ChatMessage = {
  author: string;
  message: string;
  date: Date;
  uid: string;
  color: string;
}

function randomEnum<T>(anEnum: T): T[keyof T] {
  const enumValues = (Object.values(anEnum) as unknown) as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * enumValues.length);
  return enumValues[randomIndex];
}

export type RawRechatMessage = {
  message: {
    body: string;
    user_color: string;
  };
  commenter: {
    display_name: string;
  };
  content_offset_seconds: number;
  created_at: string;
}
export type RechatMessage = {
  message: {
    body: string;
    user_color: string;
  };
  commenter: {
    display_name: string;
  };
  content_offset_seconds: number;
  created_at: Date;
}

export const randomTwitchChatColor = () => randomEnum(TwitchChatColor)