console.log('Using vue.config.js')

module.exports = {
    chainWebpack: config => {
        config.module
          .rule('js')
          .test(/\.js$/)
          .use('@open-wc/webpack-import-meta-loader')
            .loader('@open-wc/webpack-import-meta-loader')
            .end()
      }
}