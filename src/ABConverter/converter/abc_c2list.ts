/**
 * 처리기_두 열 목록 버전
 * 
 * - md_str <-> 목록 데이터
 * - 목록 데이터 <-> html
 * - 표 데이터 -> 목록 데이터
 */

import { ABReg } from '../ABReg'
import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import type {ListItem, List_ListItem} from "./abc_list"

/// 두 열 목록, 특징은 level이 0과 1만 있음
/// 
/// @detail
/// 일반적으로 사용됨:
/// - 이층 일차 트리
///     - dirTree의 초기 처리
///     - 탭
///     - 타임라인
///     - 리스트 모방
///     - ...
/// - 이층 다차 트리
///     - fc-table (첫 열 중요한 트리)
///     - ...
/// 
/// 특히 mdit-container의 `:::+@`에 대해서는 이 방식이 더 편리함
export interface C2ListItem extends ListItem {
  level: 0|1;
}[]
export type List_C2ListItem = C2ListItem[]

/// 일부 목록 관련 도구 모음
export class C2ListProcess{

  // ----------------------- str -> listData ------------------------

  /**
   * 다층 트리를 이층 일차 트리로 변환
   * 
   * @detail
   * 특징은 level이 0과 1 두 가지뿐임
   * 
   * example:
   * - 1
   *  - 2
   *   - 3
   *  - 2
   * to:
   * - 1
   *  - 2\n   - 3\n  - 2
   */
  static data_mL_2_2L1B(
    list_itemInfo: List_ListItem
  ): List_C2ListItem{
    let list_itemInfo2: List_C2ListItem = []
    const level1:0 = 0
    const level2:1 = 1
    let flag_leve2 = false  // level2가 트리거되었음을 나타내며, level1을 만나면 리셋됨
    for (let itemInfo of list_itemInfo) {
      if (level1>=itemInfo.level){                                // level1임
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level1
        })
        flag_leve2 = false
        continue
      }
      if (true){                                                  // level2/level2+/level2-임
        if (!flag_leve2){                                           // 새로 생성
          list_itemInfo2.push({
            content: itemInfo.content.trim(),
            level: level2
          })
          flag_leve2 = true
          continue
        }
        else {                                                      // 내부 줄바꿈
          let old_itemInfo = list_itemInfo2.pop()
          if(old_itemInfo){
            let new_content = itemInfo.content.trim()
            if (itemInfo.level>level2) new_content = "- "+new_content
            for (let i=0; i<(itemInfo.level-level2); i++) new_content = " "+new_content;
            new_content = old_itemInfo.content+"\n"+new_content
            list_itemInfo2.push({
              content: new_content,
              level: level2
            })
          }
        }
      }
    }
    return list_itemInfo2
  }

  /**
   * 다층 트리를 이층 트리로 변환
   * 
   * @detail
   * 특징은 level이 0과 1 두 가지뿐임
   * 
   * example:
   * - 1
   *  - 2
   *   - 3
   *  - 2
   * to:
   * - 1
   *  - 2\n   - 3
   *  - 2
   */
  static data_mL_2_2L(
    list_itemInfo: List_ListItem
  ): List_C2ListItem{
    let list_itemInfo2: List_C2ListItem = []
    const level1:0 = 0
    const level2:1 = 1
    for (let itemInfo of list_itemInfo) {
      if (level1>=itemInfo.level){                                // level1임
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level1
        })
        continue
      }
      if (level2>=itemInfo.level){                                // level2/level2-임
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level2
        })
        continue
      }
      else{                                                       // level2+임, 내부 줄바꿈
        let old_itemInfo = list_itemInfo2.pop()
        if(old_itemInfo){
          let new_content = itemInfo.content.trim()
          if (itemInfo.level>level2) new_content = "- "+new_content
          for (let i=0; i<(itemInfo.level-level2); i++) new_content = " "+new_content;
          new_content = old_itemInfo.content+"\n"+new_content
          list_itemInfo2.push({
            content: new_content,
            level: level2
          })
        }
      }
    }
    return list_itemInfo2
  }

  /**
   * 목록을 두 열 목록 데이터로 변환
   * 
   * @detail
   * 왜 직접 변환해야 하는가, list2data|data2c2data를 재사용할 수 없는 이유
   * 정보 손실이 발생하기 때문
   * 
   * @param text 목록의 md 텍스트
   * @param modeG 내부 줄바꿈 기호 인식. 내부 줄바꿈 기호는 줄바꿈+접두사로 대체되며, listdata의 처리보다 간단하고, 이후 level을 높일 필요 없음 // TODO 이 부분 로직은 독립적인 처리기로 추출해야 함
   */
  static list2c2data(text: string, modeG=true){
    let list_itemInfo:List_C2ListItem = []
    const list_text = text.trimStart().split("\n")

    // 최대 제목 수준 가져오기
    const first_match = list_text[0].match(ABReg.reg_list_noprefix)
    if (!first_match || first_match[1]) {
      console.error("목록 내용이 아님:", list_text[0])
      return list_itemInfo
    }
    const root_list_level:number = first_match[1].length // 첫 번째 목록(가장 작은 들여쓰기)의 `- ` 앞 공백 수
    
    // 순환 채우기
    let current_content:string = "" // level1의 하위 내용
    let current_content_prefix:string = "" // level1의 하위 내용의 접두사
    for (let line of list_text) {
      const match_list = line.match(ABReg.reg_list_noprefix)
      if (match_list && !match_list[1] && match_list[1].length<=root_list_level){ // b1. 동일한 제목을 만나면, level0 새 항목 등장
        add_current_content()
        let content = match_list[4]
        // 내부 줄바꿈 기호 대체
        if (modeG) {
          const inlines = match_list[4].split(ABReg.inline_split)
          if (inlines.length > 1) {
            const second_part = content.indexOf(inlines[1])
            current_content += content.slice(second_part) + "\n"
            current_content_prefix = "  " // 내부 줄바꿈 접두사는 반드시 두 공백
            content = inlines[0]
          }
        }
        // 새 항목
        list_itemInfo.push({
          content: content,
          level: 0
        })
      } else { // b2. 하위 내용
        if (current_content.trim()=="") { // 첫 번째 줄의 하위 내용 접두사 추출
          if (match_list && match_list[1]) current_content_prefix = match_list[1]
          else current_content_prefix = ""
        }
        if (line.startsWith(current_content_prefix)) { // 하위 내용 접두사 제거
          line = line.substring(current_content_prefix.length);
        }
        current_content += line+"\n" // 하위 내용 연결
      }
    }
    add_current_content()
    return list_itemInfo

    function add_current_content(){ // 캐시의 꼬리 호출 새로고침
      if (current_content.trim()=="") return
      list_itemInfo.push({
        content: current_content,
        level: 1
      })
      current_content = ""
    }
  }

  /**
   * 제목 개요를 목록 데이터로 변환
   * 
   * @detail
   * 왜 직접 변환해야 하는가, title2list를 재사용할 수 없는 이유
   * title2list는 제목 정보를 손실하기 때문
   */
  static title2c2data(text: string){
    let list_itemInfo:List_C2ListItem = []
    const list_text = text.trimStart().split("\n")

    // 최대 제목 수준 가져오기
    const first_match = list_text[0].match(ABReg.reg_heading_noprefix)
    if (!first_match || first_match[1]) {
      console.error("제목 내용이 아님:", list_text[0])
      return list_itemInfo
    }
    const root_title_level:number = first_match[3].length-1 // 첫 번째 제목(가장 높은 수준의 제목)의 `#` 개수
    
    // 순환 채우기
    let current_content:string = ""
    for (let line of list_text) {
      const match_heading = line.match(ABReg.reg_heading_noprefix)
      if (match_heading && !match_heading[1] && (match_heading[3].length-1)<=root_title_level){ // 동일한 제목을 만남
        add_current_content()
        list_itemInfo.push({
          content: match_heading[4],
          level: 0
        })
      } else {
        current_content += line+"\n"
      }
    }
    add_current_content()
    return list_itemInfo

    function add_current_content(){ // 캐시의 꼬리 호출 새로고침
      if (current_content.trim()=="") return
      list_itemInfo.push({
        content: current_content,
        level: 1
      })
      current_content = ""
    }
  }

  /**
   * 두 열 목록 데이터를 탭으로 변환
   */
  static c2data2tab(
    list_itemInfo: List_C2ListItem, 
    div: HTMLDivElement,
    modeT: boolean
  ){
    // GeneratorTab, 원래 svelte 코드
    {
      const tab = document.createElement("div"); div.appendChild(tab); tab.classList.add("ab-tab-root");
      if (modeT) tab.setAttribute("modeT", "true")
      const nav = document.createElement("div"); tab.appendChild(nav); nav.classList.add("ab-tab-nav");
      const content = document.createElement("div"); tab.appendChild(content); content.classList.add("ab-tab-content")
      let current_dom:HTMLElement|null = null
      for (let i=0; i<list_itemInfo.length; i++){
        const itemInfo = list_itemInfo[i]
        if (!current_dom){            // 시작 표시 찾기
          if (itemInfo.level==0){
            const nav_item = document.createElement("button"); nav.appendChild(nav_item); nav_item.classList.add("ab-tab-nav-item");
              nav_item.textContent = itemInfo.content.slice(0,20); nav_item.setAttribute("is_activate", i==0?"true":"false");
            current_dom = document.createElement("div"); content.appendChild(current_dom); current_dom.classList.add("ab-tab-content-item");
              current_dom.setAttribute("style", i==0?"display:block":"display:none"); current_dom.setAttribute("is_activate", i==0?"true":"false");
          }
        }
        else{                         // 종료 찾기, 표시 필요 없음, 전달된 것은 이층 일차 트리임
          ABConvertManager.getInstance().m_renderMarkdownFn(itemInfo.content, current_dom)
          current_dom = null
        }
      }
      // 모든 요소 생성 후 버튼 이벤트 바인딩, 그렇지 않으면 문제가 발생할 수 있음
      const lis:NodeListOf<HTMLButtonElement> = tab.querySelectorAll(":scope>.ab-tab-nav>.ab-tab-nav-item")
      const contents = tab.querySelectorAll(":scope>.ab-tab-content>.ab-tab-content-item")
      if (lis.length!=contents.length) console.warn("ab-tab-nav-item과 ab-tab-content-item의 수가 일치하지 않음")
      for (let i=0; i<lis.length; i++){
        // 1. 둘 중 하나 선택, 일반 바인딩
        // ob 선택
        lis[i].onclick = ()=>{
          for (let j=0; j<contents.length; j++){
            lis[j].setAttribute("is_activate", "false")
            contents[j].setAttribute("is_activate", "false")
            contents[j].setAttribute("style", "display:none")
          }
          lis[i].setAttribute("is_activate", "true")
          contents[i].setAttribute("is_activate", "true")
          contents[i].setAttribute("style", "display:block")
        }
      }
    }

    return div
  }

  /// 두 열 목록을 `컨테이너-요소` 구조로 변환
  static c2data2items(c2listdata:List_C2ListItem, el:HTMLElement): HTMLElement {
    const el_items = document.createElement("div"); el.appendChild(el_items); el_items.classList.add("ab-items")
    let el_item:HTMLElement|null = null;
    for (let item of c2listdata) {
      if (item.level == 0) {
        el_item = document.createElement("div"); el_items.appendChild(el_item); el_item.classList.add("ab-items-item")
        const el_title = document.createElement("div"); el_item.appendChild(el_title); el_title.classList.add("ab-items-title")
        ABConvertManager.getInstance().m_renderMarkdownFn(item.content, el_title)
      } else {
        if (!el_item) continue;
        const el_content = document.createElement("div"); el_item.appendChild(el_content); el_content.classList.add("ab-items-content")
        ABConvertManager.getInstance().m_renderMarkdownFn(item.content, el_content)
      }
    }
    return el
  }
}

const abc_list2c2listdata = ABConvert.factory({
  id: "list2c2listdata",
  name: "목록을 c2listdata로 변환",
  match: "list2c2listdata",
  default: "list2c2listdata",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.c2list_strem,
  process: (el, header, content: string): List_C2ListItem=>{
    return C2ListProcess.list2c2data(content)
  }
})

const abc_title2c2listdata = ABConvert.factory({
  id: "title2c2listdata",
  name: "제목을 c2listdata로 변환",
  match: "title2c2listdata",
  default: "title2c2listdata",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.c2list_strem,
  process: (el, header, content: string): List_C2ListItem=>{
    return C2ListProcess.title2c2data(content)
  }
})

const abc_c2listdata2tab = ABConvert.factory({
  id: "c2listdata2tab",
  name: "c2listdata를 탭으로 변환",
  match: "c2listdata2tab",
  default: "c2listdata2tab",
  process_param: ABConvert_IOEnum.c2list_strem,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: List_C2ListItem): HTMLElement=>{
    return C2ListProcess.c2data2tab(content, el, false)
  }
})

const abc_c2listdata2items = ABConvert.factory({
  id: "c2listdata2items",
  name: "c2listdata를 컨테이너 구조로 변환",
  match: "c2listdata2items",
  default: "c2listdata2items",
  process_param: ABConvert_IOEnum.c2list_strem,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: List_C2ListItem): HTMLElement=>{
    return C2ListProcess.c2data2items(content, el)
  }
})
