<template>
    <p class="chatContent" v-html="format"></p>
</template>

<script lang="ts">
import { EmoteFiles, MetaData } from "@/types";
import { ChatMessage } from "@/utils";
import { Component, InjectReactive, Vue } from "vue-property-decorator";

const ChatEntryProps = Vue.extend({
  props: {
    item: Object as () => ChatMessage,
  }
});

@Component({
})
export default class ChatEntry extends ChatEntryProps {
    @InjectReactive('emoteFiles') readonly emoteFiles!: EmoteFiles
    @InjectReactive('metadata') readonly metadata!: MetaData
    @InjectReactive('badges') readonly badges!: EmoteFiles
    @InjectReactive('channelName') readonly channelName!: string

    formatDate(date: Date) {
        const utcMins = date.getUTCMinutes() < 9 ? ("0" + date.getUTCMinutes() ) : date.getUTCMinutes()
        return `<span class="chatTimestamp">${date.getUTCHours()}:${utcMins} </span>`
    }
    formatUser(author: string, color: string) {
        return `<span class="chatAuthor" style="color: ${color};">${author}: </span>`
    }
    formatMessage(message: string) {
        return message.split(' ').map(
        k => {
            if (typeof this.emoteFiles[k] !== "undefined") {
                return `<img src="${this.emoteFiles[k]}" alt="${k}" class="emote"/>`
            } else {
                return k
            }
        }
        ).join(' ')
    }

    formatModerator(author: string): string | null {
        for (const moderator of this.metadata.mods) {
            if (moderator == author) {
                return `<img src="${this.badges['mod']}" alt="moderator-icon" class="_wut emote" />`
            }
        }
        return null
    }

    formatBroadcaster(author: string): string | null {
        if (this.channelName == author.toLowerCase()) {
            return `<img src="${this.badges['broadcaster']}" alt="broadcaster-icon" class="_wut emote" />`
        }
        return null
    }

    _format(item: ChatMessage): string {
        return [
            this.formatDate(item.date),
            this.formatModerator(item.author),
            this.formatBroadcaster(item.author),
            this.formatUser(item.author, item.color),
            this.formatMessage(item.message)
        ].join('')
    }

    get format() {
        return this._format(this.item);
    }
}
</script>
<style>
._wut {
    margin-right: 0.3rem;
}
.emote {
    vertical-align: middle;
}
</style>
