/* eslint-disable @typescript-eslint/camelcase */
import {
  RawRechatMessage, RechatMessage
} from './utils'

function proceesRawRechatMessages(
    inp: RawRechatMessage[]
  ): RechatMessage[] {
    return inp.map(
      p => ({
        message: p.message,
        commenter: p.commenter,
        created_at: new Date(p.created_at),
        content_offset_seconds:  p.content_offset_seconds,
      }) as RechatMessage
    )
  }

function readChatInner(
  file: File,
  onProgress: (event: ProgressEvent<FileReader>) => void,
  onLoad: (event: ProgressEvent<FileReader>) => void
): Promise<RawRechatMessage[]> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();  
      fr.onload = (e: ProgressEvent<FileReader>) => {
        if (typeof fr.result === "undefined") {
          reject('file was undefined')
        } else if (fr.result == null) {
          reject('file was null')
        } else if (typeof fr.result === "string") {
          try {
            console.log('JSON parse')
            const p = JSON.parse(fr.result)
            console.log('JSON parse done, resolving')
            onLoad(e)
            resolve(p)
          } catch(e) {
            reject('BAD JSON')
          }
        } else {
          reject('how to handle arraybuffer????')
        }
      };
      fr.onprogress = onProgress
      fr.readAsText(file);
    });
}
export async function readChat(
  file: File,
  onProgress: (event: ProgressEvent<FileReader>) => void,
  onLoad: (event: ProgressEvent<FileReader>) => void
): Promise<RechatMessage[]> {
    return proceesRawRechatMessages(
      await readChatInner(file, onProgress, onLoad)
    )
}

export async function resolveImage(file: File) {
    return await new Promise(res => {
        const reader = new FileReader();

        reader.onload = function(event) {
            res(event.target?.result)
        };
        reader.readAsDataURL(file);
    })
}

export async function resolveJson(
  file: File,
  onProgress: (event: ProgressEvent<FileReader>) => void,
  onLoad: (event: ProgressEvent<FileReader>) => void
) {
    return (
        await readChatInner(file, onProgress, onLoad)
    ) as unknown as {channelName: string; channelID: string; mods: string[]}
}