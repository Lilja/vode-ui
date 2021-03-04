import {TwitchChatColor} from './utils'
import Vuex from 'vuex'

import Vue from 'vue'

Vue.use(Vuex)

type UserColor = Record<string, TwitchChatColor>

export default new Vuex.Store({
    state: {
      userColors: {} as UserColor
    },
    mutations: {
      setUsernameColor(
        state, 
        {username, color}: {username: string; color: TwitchChatColor}
      ) {
        state.userColors[username] = color
      }
    },
    getters: {
      getUserName: (state) => (username: string): TwitchChatColor | null=> {
          return (
              typeof state.userColors[username] === "undefined"
          ) ? null : state.userColors[username]
      }
    }
  })