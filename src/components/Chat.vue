<template>
  <div class="chat" ref="chat">
    <div v-for="item in chatQueue" class="chatEntry" :key="item.uid">
      <ChatEntry :item="item"/>
    </div>
  </div>
</template>

<script lang="ts">
import { ChatMessage } from "@/utils";
import { Component, InjectReactive, Vue } from "vue-property-decorator";
import ChatEntry from "./ChatEntry.vue";

@Component({
    components: {
        ChatEntry
    }
})
export default class Chat extends Vue {
    $refs!: {
        chat: HTMLElement;
    }
    @InjectReactive('chatQueue')
    readonly chatQueue!: ChatMessage[]

    updated() {
        this.$nextTick(() => this.$el.scrollTop = this.$el.scrollHeight)
    }
}
</script>
