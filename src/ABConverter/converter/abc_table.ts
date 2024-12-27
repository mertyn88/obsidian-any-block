/**
 * 처리기_표 버전
 * 
 * - md_str <-> 표 데이터
 * - 표 데이터 <-> html
 * - 목록 데이터 -> 표 데이터
 */

import { ABReg } from '../ABReg'
import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import { type ListItem, type List_ListItem, ListProcess, abc_title2listdata, abc_list2listdata } from "./abc_list"
import { type C2ListItem, type List_C2ListItem, C2ListProcess } from "./abc_c2list"

/**
 * 일반 표 데이터, 하나의 요소는 하나의 셀 항목 (th/td)과 같습니다.
 * 
 * 예를 들어:
 * - a1
 *   - a2
 *     - a3
 *   - b2
 *     - b3
 * to
 * |a1|a2|a3|
 * |^ |b2|b3|
 * with
 * {
 *   // 앞 두 열은 ListItem에서 온 것입니다.
 *   // 두 번째 열은 세 번째 열을 계산하는 데 사용되며, 세 번째 열이 계산된 후에는 두 번째 열이 더 이상 필요하지 않습니다.
 *   {a1, 무용, 2, 1},
 *   {a2, 무용, 1, 1},
 *   {a3, 무용, 1, 1},
 *   {b2, 무용, 1, 2},
 *   {b3, 무용, 1, 2},
 * }
 */
export interface TableItem extends ListItem{
    tableRowSpan: number,       // 행 수
    //tableColumnSpan: number,  // 열 수
    tableRow: number,           // 해당하는 첫 번째 행 시퀀스
    //tableColum: number,       // 해당하는 첫 번째 열 시퀀스
}
export type List_TableItem = TableItem[]  

/// 일부 표 관련 도구 모음
export class TableProcess{

  /** 목록을 2차원 표로 변환 */
  static list2ut(text: string, div: HTMLDivElement, modeT=false) {
    //【old】
    /*let list_itemInfo = ListProcess.old_ulist2data(text)
    return TableProcess.data2table(list_itemInfo, div)*/
    //【new】
    let data = ListProcess.list2data(text)
    data = ListProcess.data2strict(data)
    data = C2ListProcess.data_mL_2_2L(data)
    data = ListProcess.data_2L_2_mL1B(data)
    return TableProcess.data2table(data, div, modeT)
  }

  /** 목록을 타임라인으로 변환 */
  static list2timeline(text: string, div: HTMLDivElement, modeT=false) {
    let data = C2ListProcess.list2c2data(text)
    div = TableProcess.data2table(data, div, modeT)
    const table = div.querySelector("table")
    if (table) table.classList.add("ab-table-timeline", "ab-table-fc")
    return div 
  }

  /** 제목을 타임라인으로 변환 */
  static title2timeline(text: string, div: HTMLDivElement, modeT=false) {
    let data = C2ListProcess.title2c2data(text)
    div = TableProcess.data2table(data, div, modeT)
    const table = div.querySelector("table")
    if (table) table.classList.add("ab-table-timeline", "ab-table-fc")
    return div 
  }

  /** 목록 데이터를 표로 변환 */
  static data2table(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement,
    modeT: boolean        // 전치 여부
  ){
    // 표 데이터로 조립 (목록은 깊이 우선)
    let list_tableInfo:List_TableItem = []
    let prev_line = -1   // 다음 행의 시퀀스를 저장!
    let prev_level = 999 // 이전 행의 레벨
    for (let i=0; i<list_itemInfo.length; i++){
      let item = list_itemInfo[i]
      
      // 행 수 가져오기
      let tableRow = 1
      let row_level = list_itemInfo[i].level
      for (let j=i+1; j<list_itemInfo.length; j++) {
        if (list_itemInfo[j].level > row_level){                  // 오른쪽에 있으며, 줄 바꿈 없음
          row_level = list_itemInfo[j].level
        }
        else if (list_itemInfo[j].level > list_itemInfo[i].level){// 줄 바꿈은 있지만 항목의 행은 바꾸지 않음
          row_level = list_itemInfo[j].level
          tableRow++
        }
        else break                                                // 항목의 행을 바꿈
      }

      // 행 수 가져오기. 줄 바꿈 (새 행 생성)과 줄 바꿈 없음으로 나뉨, 첫 번째 행은 항상 새 행 생성
      // 여기의 if는 줄 바꿈을 의미합니다.
      if (item.level <= prev_level) {
        prev_line++
      }
      prev_level = item.level

      // 작성
      list_tableInfo.push({
        content: item.content,  // 내용
        level: item.level,      // 레벨
        tableRowSpan: tableRow,     // 행 수
        tableRow: prev_line    // 해당하는 첫 번째 행 시퀀스
      })
    }

    // GeneratorBranchTable, 원래는 svelte
    {
      // 표 데이터 표로 조립
      const table = document.createElement("table"); div.appendChild(table); table.classList.add("ab-table", "ab-branch-table")
      if (modeT) table.setAttribute("modeT", "true")
      let thead
      if(list_tableInfo[0].content.indexOf("< ")==0){ // 헤더가 있는지 확인
        thead = document.createElement("thead"); table.appendChild(thead);
        list_tableInfo[0].content=list_tableInfo[0].content.replace(/^\<\s/,"")
      }
      const tbody = document.createElement("tbody"); table.appendChild(tbody);
      for (let index_line=0; index_line<prev_line+1; index_line++){ // 표 행을 순회하며 tr 생성……
        let is_head
        let tr
        if (index_line==0 && thead){ // 첫 번째 행인지 && 헤더가 있는지 확인
          tr = document.createElement("tr"); thead.appendChild(tr);
          is_head = true
        }
        else{
          is_head = false
          tr = document.createElement("tr"); tbody.appendChild(tr);
        }
        for (let item of list_tableInfo){                           // 표 열을 순회하며 td 생성
          if (item.tableRow!=index_line) continue
          let td = document.createElement(is_head?"th":"td"); tr.appendChild(td);
            td.setAttribute("rowspan", item.tableRowSpan.toString()); td.setAttribute("col_index", item.level.toString())
          ABConvertManager.getInstance().m_renderMarkdownFn(item.content, td)
        }
      }
    }

    return div
  }
}

// 순수 조합, 후속 별칭 모듈 대체
const abc_title2table = ABConvert.factory({
  id: "title2table",
  name: "제목을 표로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const data: List_ListItem = abc_title2listdata.process(el, header, content) as List_ListItem
    return el = TableProcess.data2table(data, el, false) as HTMLDivElement
  }
})

// 순수 조합, 후속 별칭 모듈 대체
const abc_list2table = ABConvert.factory({
  id: "list2table",
  name: "목록을 표로",
  match: /list2(md)?table(T)?/,
  default: "list2table",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/list2(md)?table(T)?/)
    if (!matchs) return el
    const data: List_ListItem = abc_list2listdata.process(el, header, content) as List_ListItem
    return el = TableProcess.data2table(data, el, matchs[2]=="T") as HTMLDivElement
  }
})

const abc_list2c2table = ABConvert.factory({
  id: "list2c2t",
  name: "목록을 이중 목록 표로",
  match: "list2c2t",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let data = C2ListProcess.list2c2data(content)
    TableProcess.data2table(data, el, false)
    return el
  }
})

const abc_list2ut = ABConvert.factory({
  id: "list2ut",
  name: "목록을 2차원 표로",
  match: /list2(md)?ut(T)?/,
  default: "list2ut",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/list2(md)?ut(T)?/)
    if (!matchs) return el
    TableProcess.list2ut(content, el, matchs[2]=="T")
    return el
  }
})

const abc_list2timeline = ABConvert.factory({
  id: "list2timeline",
  name: "목록을 타임라인으로",
  match: /list2(md)?timeline(T)?/,
  default: "list2mdtimeline",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/list2(md)?timeline(T)?/)
    if (!matchs) return el
    TableProcess.list2timeline(content, el, matchs[2]=="T")
    return el
  }
})

const abc_title2timeline = ABConvert.factory({
  id: "title2timeline",
  name: "제목을 타임라인으로",
  match: /title2(md)?timeline(T)?/,
  default: "title2mdtimeline",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/title2(md)?timeline(T)?/)
    if (!matchs) return el
    TableProcess.title2timeline(content, el, matchs[2]=="T")
    return el
  }
})
