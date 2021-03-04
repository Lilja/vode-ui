declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

import { ComponentCustomProperties } from 'vue'
import { Store } from 'vuex'
import { TwitchChatColor } from './utils'

declare module '@vue/runtime-core' {
  interface State {
    userColors: {[key: string]: TwitchChatColor}
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>
  }
}