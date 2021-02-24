// ==UserScript==
// @name         dark-light-toggle
// @namespace    http://tampermonkey.net/
// @version      0.1.20
// @description  网站@media (prefers-color-scheme: dark|light)主题样式切换，深色模式和浅色模式的切换
// @author       taumu, xhyumiracle
// @license      MIT
// @include      https://mp.weixin.qq.com/*
// @run-at       document-start
// @require      https://unpkg.com/style-media-toggle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// xhyumiracle modified from https://greasyfork.org/zh-CN/scripts/396483-%E4%B8%BB%E9%A2%98%E5%88%87%E6%8D%A2
(function() {
  // eslint-disable-next-line
  'use strict'

  const mediaName = 'prefers-color-scheme'
  const { matches: isDark } = matchMedia(`(${mediaName}: dark)`)
  const { host, origin } = window.location
  const saveName = `${mediaName}:${host}`
  let isCallMatchMedia = false

  function getValue(name, defaultVal = true) {
    // eslint-disable-next-line no-undef
    return GM_getValue(name, defaultVal)
  }

  function registerMenu(title, name) {
    const value = name && getValue(name)
    let rTitle = title
    if (name && value) {
      rTitle += '√'
    }
    // eslint-disable-next-line no-undef
    GM_registerMenuCommand(rTitle, () => {
      if (name) {
        // eslint-disable-next-line no-undef
        GM_setValue(name, !value)
        window.location.reload()
      } else {
        alert('当前系统主题下无可切换主题')
      }
    })
  }

  function getUrl(src, path) {
    if (['http', 'https'].some(head => path.startsWith(head))) return path

    const fixPath = path.replace(/["']/g, '')
    const sList = src.split('/')
    const pList = fixPath.split('/')
    const hostPath = sList
      .slice(0, 3)
      .filter(v => !!v)
      .join('//')
    let absPath
    if (fixPath.startsWith('/')) {
      absPath = pList.slice(1)
    } else {
      const lastIndex = pList.lastIndexOf('..')
      const index = lastIndex === -1 ? undefined : lastIndex + 1
      absPath = sList
        .slice(3, index && -index)
        .concat(pList.slice(index).filter(v => v !== '.'))
    }
    return `url(${hostPath}/${absPath.join('/')})`
  }

  function replaceCssText(cssText, href) {
    const lastIndex = href.lastIndexOf('/')
    const src = href.slice(0, lastIndex)
    return cssText.replace(/url\(([^)]*)\)/g, (match, p1) => {
      if (p1.includes('data:image')) {
        return match
      }
      return getUrl(src, p1)
    })
  }

  const herfSet = new Set()
  function replaceStyle(styleSheet) {
    const { href } = styleSheet
    if (herfSet.has(href)) return

    herfSet.add(href)
    // eslint-disable-next-line no-undef
    GM_xmlhttpRequest({
      method: 'GET',
      url: href,
      headers: {
        referer: origin
      },
      onload: res => {
        const { responseText } = res
        const style = document.createElement('style')
        style.innerText = replaceCssText(responseText, href)
        // eslint-disable-next-line no-param-reassign
        styleSheet.disabled = true
        document.head.appendChild(style)
      },
    })
  }

  // eslint-disable-next-line no-undef
  const mediaToggle = getMediaToggle({
    onError(e, styleSheet) {
      replaceStyle(styleSheet)
    },
  })

  const themeMap = new Map([
    [
      'dark',
      {
        isDefault: isDark,
        title: 'Dark Mode',
        menuId: null,
      },
    ],
    [
      'light',
      {
        isDefault: !isDark,
        title: 'Light Mode',
        menuId: null,
      },
    ],
  ])
  let first = false
  function toggle() {
    first = true
    const mediaMap = mediaToggle.get()
    const keys = Array.from(mediaMap.keys()).filter(key =>
      key.includes(mediaName)
    )

    themeMap.forEach((theme, k) => {
      const { menuId, title, isDefault } = theme
      if (keys.length || isCallMatchMedia) {
        if (isDefault) {
          const key = keys.find(item => item.includes(k))
          const media = key && mediaMap.get(key)
          const value = getValue(saveName)
          if (media) {
            media.toggle(!value)
          }
          // eslint-disable-next-line no-param-reassign
          if (!menuId) theme.menuId = registerMenu(title, saveName)
        }
      } else if (menuId) {
        // eslint-disable-next-line no-undef
        GM_unregisterMenuCommand(menuId)
        // eslint-disable-next-line no-param-reassign
        theme.menuId = null
      }
    })
  }

  mediaToggle.subscribe(toggle)
  if (!first) toggle()
})();
