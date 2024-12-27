/**
 * AB 변환기 - markdown-it-container 기능 모방
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {C2ListProcess, type List_C2ListItem} from "./abc_c2list"
import {ABReg} from "../ABReg"

/// mdit-tabs의 표준에 따라 이열 리스트 데이터로 변환
function mditTabs2listdata(content:string, reg: RegExp): List_C2ListItem {
  let list_line = content.split("\n")
  let content_item: string = ""
  let list_c2listItem: List_C2ListItem = []
  for (let line_index=0; line_index<list_line.length; line_index++) {
    let line_content = list_line[line_index]
    const line_match = line_content.match(reg)
    if (line_match) {
      add_current_content()
      list_c2listItem.push({
        content: line_match[1].trim(),
        level: 0
      })
      continue
    }
    else {
      content_item += line_content + "\n"
    }
  }
  add_current_content()

  return list_c2listItem

  function add_current_content() { // 캐시된 내용을 새로고침하여 기록
    if (content_item.trim() == "") return
    list_c2listItem.push({
      content: content_item,
      level: 1
    })
    content_item = ""
  }
}

const abc_mditTabs = ABConvert.factory({
  id: "mditTabs",
  name: "mdit탭",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let c2listdata: List_C2ListItem = mditTabs2listdata(content, /^@tab(.*)$/)
    C2ListProcess.c2data2tab(c2listdata, el, false)
    return el
  }
})

const abc_mditDemo = ABConvert.factory({
  id: "mditDemo",
  name: "mdit전시 비교",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const newContent = `@tab show\n${content}\n@tab mdSource\n~~~~~md\n${content}\n~~~~~`
    abc_mditTabs.process(el, header, newContent)
    return el
  }
})

const abc_mditABDemo = ABConvert.factory({
  id: "mditABDemo",
  name: "AnyBlock 전용 전시 비교",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const newContent = `@tab show\n${content}\n@tab withoutPlugin\n(noPlugin)${content.trimStart()}\n@tab mdSource\n~~~~~md\n${content}\n~~~~~`
    abc_mditTabs.process(el, header, newContent)
    return el
  }
})

/**
 * 요약 분할 방식：
 * 1. 태그에 따라 분할 (수동 분할)
 * 2. 분할 개수 지정 (자동 분할)
 */
const abc_midt_co = ABConvert.factory({
  id: "mditCol",
  name: "mdit분할",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let c2listdata: List_C2ListItem = mditTabs2listdata(content, /^@col(.*)$/) // /^@[a-zA-Z]* (.*)$/
    C2ListProcess.c2data2items(c2listdata, el)
    el.querySelector("div")?.classList.add("ab-col")
    return el
  }
})

const abc_midt_card = ABConvert.factory({
  id: "mditCard",
  name: "mdit카드",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let c2listdata: List_C2ListItem = mditTabs2listdata(content, /^@card(.*)$/) // /^@[a-zA-Z]* (.*)$/
    C2ListProcess.c2data2items(c2listdata, el)
    el.querySelector("div")?.classList.add("ab-card")
    return el
  }
})
