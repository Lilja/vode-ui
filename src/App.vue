<template>
  <div id="app"
    @drop="notDragging"
    @drag="setDragging"
    @dragover.prevent
    @dragend="notDragging"
    @dragleave="handleDragLeave"
    @dragenter="handleDragEnter"
    >
      <div class="container">
        <InitialScreen 
          v-if="showDropFiles"
          v-on:fileChanges="handleFile"
          v-on:loadingInsideDropComponentEvent="handleLoadingInDropComponent"
          v-on:chatContents="handleChatContents"
        />
        <video
          v-if="!showDropFiles"
          @drag="setDragging"
          @dragover.prevent
          @dragend="notDragging"
          @dragleave="handleDragLeave"
          @dragenter="handleDragEnter"
          class="video"
          ref="video"
          controls=""
          autoplay=""
          muted
          @seeked="onSeeked"
          @pause="onPause"
          @play="onPlay"
          accept="video/*"
          >
          <source ref="videoSource" />   
        </video>
        <Chat 
          v-if="!showDropFiles"
          ref="chat"
          :emoteFiles="emoteFiles" 
          :chatQueue="chatQueue" 
          :badges="badges" 
          :metadata="metadata"
        /> 
    </div>
    <input 
      class="hiddenFileInput"
      multiple
      type="file"
    />
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/camelcase */
import { Component, Vue, ProvideReactive } from 'vue-property-decorator';
import Chat from './components/Chat.vue'
import {
  EmoteFiles, MetaData
} from './types'
import {
  ChatMessage, uuidv4, RechatMessage
} from './utils'
import {
  readChat,
  resolveImage,
  resolveJson,
} from './chat'
import InitialScreen from './components/InitialScreen.vue'

class TooManyMessages extends Error {
  constructor() {
    super('N/A')
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, TooManyMessages.prototype);
  }
}

@Component({
  components: {
    Chat,
    InitialScreen
  },
})
export default class App extends Vue {
  $refs!: {
    video: HTMLVideoElement;
    videoSource: HTMLSourceElement;
    chat: HTMLElement;
  }

  @ProvideReactive('chatQueue')
  chatQueue: ChatMessage[] = []
  @ProvideReactive('emoteFiles')
  emoteFiles: EmoteFiles  = {}
  @ProvideReactive('chatFile')
  chatFile: RechatMessage[] = []
  @ProvideReactive('badges')
  badges: EmoteFiles = {}
  @ProvideReactive('metadata')
  metadata: MetaData = {channelID: '', channelName: '', mods: []}
  @ProvideReactive('channelName')
  channelName = ''
  @ProvideReactive('videoFile')
  videoFile: File | null = null
  @ProvideReactive('hasVideoFile')
  hasVideoFile = false
  @ProvideReactive('hasChatFile')
  hasChatFile = false
  @ProvideReactive('numberOfEmotes')
  numberOfEmotes = 0

  index = 0
  chatLoopRef = 0
  dragging = false
  loadingInsideDropComponent = false

  handleChatContents(contents: RechatMessage[]) {
    console.log('Chat contents set')
    this.chatFile = contents
    this.hasChatFile = true
  }

  handleMetadataContents(contents: {channelName: string; channelID: string; mods: string[]}) {
    console.log('Metadata contents set', contents.channelName.toLowerCase())
    this.metadata = contents
    this.channelName = this.metadata.channelName.toLowerCase()
  }

  async handleFile(files: File[]) {
    for (const file of Array.from(files)) {
      if(file.name.includes('.jpg') || file.name.includes('.gif')) {
        await this.handleAsset(file)
      } else if (file.name.includes('.mp4')) {
        console.log('Loading a mp4 file')
        this.videoFile = file
        this.hasVideoFile = true
        while (!this.$refs.videoSource) {
          console.log('Waiting for element to re-appear...')
          await new Promise(res => setTimeout(res, 100))
        }
        this.$refs.videoSource.src = URL.createObjectURL(file)
        this.$refs.video.load()
      } else if ('metadata.json' == file.name) {
        const onWhatever = () => {
          return ""
        }
        const heson = await resolveJson(file, onWhatever, onWhatever)
        this.handleMetadataContents(heson)
      }else {
        console.log('dont know what to do with this file.', file.name)
      }
    }
  }

  isBadge(fileName: string): boolean {
    if (fileName.includes('mod.jpg') || fileName.includes('broadcaster.jpg')) {
      return true
    }
    return false
  }

  createChatMessage(
    author: string,
    contents: string,
    date: Date = new Date,
    userNameColor: string
  ): ChatMessage {
    return {
      author: author,
      message: contents,
      date: date,
      uid: uuidv4(),
      color: userNameColor,
    }
  }

  insertChatMessage(
    chatMessage: ChatMessage
  ) {
    this.chatQueue.push(chatMessage)
    
    if (this.chatQueue.length > 200) {
      this.chatQueue.unshift()
    }
  }

  postMessagesUntilStop(
    chatFile: RechatMessage[],
    index: number,
    currentTime: number
  ) {
      let stop = false
      const messagesToPost = []
      while(!stop) {
        if (messagesToPost.length > 50) {
          console.log('User seeked too far to allow posting messages. Recalculating index.')
          throw new TooManyMessages()
        }
        const entry = chatFile[index];
        if (currentTime >= entry.content_offset_seconds) {
          const msg = this.createChatMessage(
            entry.commenter.display_name,
            entry.message.body,
            entry.created_at,
            entry.message.user_color
          )
          messagesToPost.push(
            msg
          )
          index++;
        } else {
          stop = true
        }
      }
      for (const msg of messagesToPost) {
        this.insertChatMessage(msg)
      }
      return index
  }

  figureOutDirection(
    chatFile: RechatMessage[],
    index: number,
    currentTime: number
  ): "GO_BACK" | "GO_FORWARD" {
    const entry = chatFile[index]
    if (entry.content_offset_seconds > currentTime) {
      // we need to go back
      return "GO_BACK"
    }
    return "GO_FORWARD"

  }
  
  recalculateIndex(
    chatFile: RechatMessage[],
    index: number,
    currentTime: number
  ) {
      const start = Date.now()
      let stop = false
      const direction = this.figureOutDirection(
        this.chatFile, index, currentTime
      )
      console.log('We need to', direction)
      while(!stop) {
        const entry = chatFile[index];
        if (direction == "GO_BACK") {
          if (currentTime <= entry.content_offset_seconds) {
            index--;
          }
          else {
            stop = true
          }
        } else {
          if (currentTime >= entry.content_offset_seconds) {
            index++;
          }
          else {
            stop = true
          }
        }
      }
      const stopCalc = (Date.now() - start)/1000
      console.log('Calculation took', stopCalc)
      return index
  }

  onPause() {
    console.log('Pausing chat loop')
    window.clearInterval(this.chatLoopRef)
  }
  onPlay() {
    console.log('Resuming chat loop')
    this.chatLoopRef = window.setInterval(this.chatLoop, 100)
  }
  onSeeked() {
    console.log('Pausing chat loop')
    window.clearInterval(this.chatLoopRef)
    this.index = this.recalculateIndex(
      this.chatFile,
      this.index,
      this.$refs.video.currentTime
    )
    console.log('Resuming chat loop')
    this.chatLoopRef = window.setInterval(this.chatLoop, 100)
  }

  chatLoop() {
    if (this.chatFile.length > 0) {
      try {
        this.index = this.postMessagesUntilStop(
          this.chatFile,
          this.index,
          this.$refs.video.currentTime
        )
      } catch(e) {
        console.log()
        if (e instanceof TooManyMessages) {
          this.index = this.recalculateIndex(this.chatFile, this.index, this.$refs.video.currentTime)
        } else {
          console.log('Error', e)
          throw e;
        }
      }
    }
  }

  convertFileName(fileName: string): string {
    let newFileName;
    newFileName = fileName.replaceAll('colon', ':')
    newFileName = newFileName.replace('.gif', '')
    newFileName = newFileName.replace('.jpg', '')

    return newFileName
  }

  async handleAsset(file: File) {
    const fileNameWithoutExtension = this.convertFileName(file.name)
    if(this.isBadge(file.name)) {
      this.badges[fileNameWithoutExtension] = await resolveImage(file)
    } else {
      this.emoteFiles[fileNameWithoutExtension] = await resolveImage(file)
      this.numberOfEmotes += 1
    }
  }

  get showDropFiles() {
    console.log(this.loadingInsideDropComponent, this.dragging, this.videoFile == null)
    return this.loadingInsideDropComponent || this.dragging || this.videoFile == null
  }

  setDragging() {
    console.log('Dragging')
    this.dragging = true
  }
  notDragging() {
    console.log('Not dragging')
    this.dragging = false
  }

  handleDragLeave(event: Event) {
      event.preventDefault()
      console.log('drag enter, not dragging')
      this.dragging = false
  }
  handleDragEnter() {
    console.log('drag enter, dragging')
    this.dragging = true
  }
  handleLoadingInDropComponent(v: boolean) {
    console.log('Listened!', v)
    if (this.$refs.videoSource && this.$refs.videoSource.src) {
      if(v) {
        console.log('Pausing')
        this.$refs.video.pause()
      } else { 
        console.log('Playing')
        this.$refs.video.play()
      }
    }
    this.loadingInsideDropComponent = v
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

html, body {
  background-color: #18181b;
  padding: 0;
  margin: 0;
}
.container {
  display: flex;
  height: 100vh;
}

.container > .video {
  flex-basis: 85%;
}

.chat {
  max-height: 100%;
  height: 100%;
  flex-basis: 15%;
  overflow: hidden;
  overflow-y: scroll;
  scrollbar-width: thin;
}

.chat > div {
  text-align: left;
  margin: 1em;
}

.chatTimestamp {
  color: gray;
}
.chatContent {
  color: white;
}

.hiddenFileInput {
  position: absolute;
  top: -5000px;
  left: -5000px;
}
</style>
