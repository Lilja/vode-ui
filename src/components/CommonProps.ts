import { EmoteFiles, MetaData } from "@/types";
import { ChatMessage } from "@/utils";

export const COMMON_PROPS = {
    emoteFiles: Object as () => EmoteFiles,
    chatQueue: Array as () => ChatMessage[],
    metadata: Object as () => MetaData,
    badges: Object as () => EmoteFiles,
    channelName: String as () => string,
}