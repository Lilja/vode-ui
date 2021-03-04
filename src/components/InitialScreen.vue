<template>
    <div
        @drop="onFileDrop"
        @dragover.prevent
        @dragleave="handleDragLeave"
        @dragenter="handleDragEnter"
        ref="filePicker"
    >
        <h1>Drop your content here!</h1>
        <p>
            Video file: {{emojifyBoolean(hasVideoFile)}} <br />
            Chat file: {{emojifyBoolean(hasChatFile)}} <br />
            Number of emotes: {{numberOfEmotes}} <br />
            Broadcaster: {{metadata.channelName}} <br />
            Moderators: <ul>
                <li v-for="mod in metadata.mods" :key="mod">{{mod}}</li>
            </ul>
        </p>
        <span v-if="loading">
            Loading ({{loadingFiles}} / {{totalLoadingFiles}} files loaded)
            <ul>
                <li
                    v-for="([key, fileLoad]) in Object.entries(currentLoadingFiles).slice(0, 15)"
                    :key="key + fileLoad"
                >
                    {{key}} - {{fileLoad}}
                </li>
            </ul>
            <span v-if="currentLoadingFilesLength > 15">
                ... and {{currentLoadingFilesLength - 15}} more files
            </span>
        </span>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Emit, InjectReactive } from "vue-property-decorator";
import { BlobReader, ZipReader, configure, BlobWriter, Entry } from "@zip.js/zip.js";
import JSZip from 'jszip';
import { resolveJson, readChat } from '../chat'
import { MetaData } from "@/types";
configure({useWebWorkers: false});

interface DragEventWithTarget extends DragEvent {
  target: HTMLInputElement;
}

@Component({})
export default class InitialScreen extends Vue {
    files: File[] = [];

    $refs!: {
        filePicker: HTMLInputElement;
    }

    get currentLoadingFilesLength() {
        return Object.keys(this.currentLoadingFiles).length
    }

    @InjectReactive('hasVideoFile')
    readonly hasVideoFile!: boolean

    @InjectReactive('hasChatFile')
    readonly hasChatFile!: boolean

    @InjectReactive('numberOfEmotes')
    readonly numberOfEmotes!: number

    @InjectReactive('metadata')
    readonly metadata!: MetaData


    loading = false
    loadingFiles = 0
    currentLoadingFiles: {[key: string]: string} = {}
    totalLoadingFiles = 0

    async onFileDrop(event: DragEventWithTarget) {
        event.preventDefault()
        this.setLoading(true)
        this.removeDraggedEffect()
        const awaitList: Promise<void>[] = []
        if (event.dataTransfer) {
            const newFiles = []
            for (const file of Array.from(event.dataTransfer.files)) {
                if (file.name.includes(".zip")) {
                    const files = await this.handleZipFile(file)
                    files.forEach(k => newFiles.push(k))
                } else {
                    if ('metadata.json' == file.name) {
                        awaitList.push()
                    } else if (file.name.includes('.json')) {
                        awaitList.push(this.handleChatContents(file) as unknown as Promise<void>)
                    } else {
                        newFiles.push(file)
                    }
                }
            }
            await Promise.all(awaitList)
            this.addNewFiles(newFiles)
        }
        this.setLoading(false)
    }
    addNewFiles(newFiles: File[]) {
        this.files = newFiles
        this.fileChanges()
    }
    removeDraggedEffect() {
        const _ref = this.$refs.filePicker
        _ref.classList.remove('dragged');
        _ref.classList.add('notDragged');
    }
    handleDragLeave(event: DragEventWithTarget) {
        event.preventDefault()
        this.removeDraggedEffect()
    }
    handleDragEnter() {
        const _ref = this.$refs.filePicker
        _ref.classList.remove('notDragged');
        _ref.classList.add('dragged');
    }

    @Emit('fileChanges')
    fileChanges() {
        console.log("filechanges, emiting upwards")
        return this.files
    }

    @Emit('loadingInsideDropComponentEvent')
    setLoading(val: boolean) {
        this.loading = val
        return val
    }

    @Emit('chatContents')
    async handleChatContents(file: File) {
        this.loadingFiles++
        this.totalLoadingFiles = this.totalLoadingFiles + 1
        const onprogress = (event: ProgressEvent<FileReader>) => {
            this.loadFile(file.name, Math.floor(event.loaded / event.total))
        } 
        const onload = () => {
            Vue.delete(this.currentLoadingFiles, file.name)
            this.loadingFiles--
            this.totalLoadingFiles = this.totalLoadingFiles - 1
        } 
        const chat = await readChat(file, onprogress, onload)
        console.log('Emiting chat')
        return chat
    }

    async getData(entry: Entry): Promise<{
        data: Blob;
        filename: string;
        lastModifiedDate: Date;
    }>  {
        // Really don't understand why this has to be manually applied? 
        // Surely a zipped file has mime types somewhere stored?!
        const resolveMime: {[key: string]: string} = {
            "jpg": "image/jpeg",
            "json": "application/json",
            "gif": "image/gif"
        }
        const fn = entry.getData
        if (typeof fn === "undefined") throw new Error('AAAAh')
        const fileExtension = entry.filename.split('.').pop() as string
        if (!resolveMime[fileExtension]) {
            throw new Error(`${entry.filename} filename not configured.`)
        }
        const data = await fn(
            new BlobWriter(resolveMime[fileExtension]), {
                onprogress(progress, total) {
                    console.log('Reading', entry.filename, progress, total)
                }
            }
        );
        return {
            data,
            filename: entry.filename,
            lastModifiedDate: entry.lastModDate
        }
    }

    async getDataJsZip(a: string, b: JSZip.JSZipObject): Promise<{
        data: Blob;
        filename: string;
        lastModifiedDate: Date;
    }> {
        this.currentLoadingFiles[a] = 0 + "%"
        const data = await b.async("blob", (m) => {
            this.loadFile(a, m.percent)
        })
        delete this.currentLoadingFiles[a]
        this.loadingFiles++
        return {
            data: data,
            filename: a,
            lastModifiedDate: b.date,
        }
    }

    async handleZipFile(blob: Blob): Promise<File[]> {
        const s = await JSZip.loadAsync(blob)
        const len = Object.values(s.files).length
        this.totalLoadingFiles = len
        const content = await Promise.all(
            Object.entries(s.files).map(([a, b]) => this.getDataJsZip(a, b))
        )
        this.totalLoadingFiles = this.totalLoadingFiles - len
        this.loadingFiles = this.loadingFiles - len
        return content.map(k => this.blobToFile(k.data, k.filename, k.lastModifiedDate))
    }
    
    async zipjsStyle(blob: Blob): Promise<File[]> {
        let blobs: {
            data: Blob;
            filename: string;
            lastModifiedDate: Date;
        }[] = []
        const reader = new ZipReader(new BlobReader(blob));
        const entries = await reader.getEntries();
        console.log('Zip file has', entries.length, 'entries')
        if (entries.length) {
            console.log('Loading...')
            blobs = await Promise.all(entries.map(k => this.getData(k)))
            console.log('Done loading zip file')
        }

        // close the ZipReader
        await reader.close();
        return blobs.map(k => this.blobToFile(k.data, k.filename, k.lastModifiedDate))
    }
    blobToFile(theBlob: Blob, fileName: string, lastModifiedDate: Date): File {
        const b: any = theBlob;
        b.lastModifiedDate = lastModifiedDate
        b.name = fileName;

        return theBlob as File;
    }
    loadFile(fileName: string, diff: number) {
        Vue.set(this.currentLoadingFiles, fileName, diff.toFixed(2) + "%")
    }
    emojifyBoolean(x: boolean): string {
        if (x) {
            return '✔️'
        } else {
            return '❌'
        }
    }
}
</script>

<style>
div {
    width: 100%;
}
h1 {
    vertical-align: middle
}

.dragged {
    opacity: 0.70;
    background-color: rgb(157, 225, 255);
}
.notDragged {
    opacity: 1;
}

</style>