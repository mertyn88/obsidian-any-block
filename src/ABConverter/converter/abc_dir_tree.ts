/**
 * 변환기_디렉토리 트리
 * 
 * md_str <-> md_str
 * md_str <-> html
 */

import { ABReg } from '../ABReg'
import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {ListProcess, type List_ListItem, type ListItem} from "./abc_list"

export interface LTableItem {
  content: string,        // 내용
  level: number,          // 행 들여쓰기, 첫 번째 열이 0일 때만 유효
  tableRow: number,       // 해당 첫 번째 행 시퀀스
  tableColumn: number,    // 해당 첫 번째 열 시퀀스, 주로 첫 번째 열인지 확인, 그렇다면 주체
  tableRowSpan: 1,        // 행 병합 수, 일반적으로 항상 1
  type: string            // 파일 유형. 첫 번째 열만 유효
}
export type List_LTableItem = LTableItem[]

export class DirProcess{
  /** 리스트를 리스트 테이블로 변환 */
  static list2lt(text: string, div: HTMLDivElement, modeT=false) {
    let list_itemInfo = DirProcess.list2dtdata(text)
    list_itemInfo = ListProcess.data2strict(list_itemInfo).map((item, index)=>{ return {
      content: list_itemInfo[index].content,
      level: item.level, // modi
      tableRow: list_itemInfo[index].tableRow,
      tableColumn: list_itemInfo[index].tableColumn,
      tableRowSpan: list_itemInfo[index].tableRowSpan,
      type: list_itemInfo[index].type,
    }})
    return DirProcess.dtdata2dt(list_itemInfo, div, modeT)
  }

  /** 리스트를 트리형 디렉토리로 변환 */
  static list2dt(text: string, div: HTMLDivElement, modeT=false) {
    let list_itemInfo = DirProcess.list2dtdata(text)
    list_itemInfo = ListProcess.data2strict(list_itemInfo).map((item, index)=>{ return {
      content: list_itemInfo[index].content,
      level: item.level, // modi
      tableRow: list_itemInfo[index].tableRow,
      tableColumn: list_itemInfo[index].tableColumn,
      tableRowSpan: list_itemInfo[index].tableRowSpan,
      type: list_itemInfo[index].type,
    }})
    return DirProcess.dtdata2dt(list_itemInfo, div, modeT, true)
  }

  /**
   * 리스트 텍스트를 리스트 테이블 데이터로 변환
   * 
   * " | " 기호를 통해서만 열 병합 가능
   * 따라서 병합된 셀이 없음
   * 
   * 첫 번째 열의 level은 항상 0
   */
  static list2dtdata(text: string): List_LTableItem{
    // 테이블 행 처리
    let list_itemInfo:List_LTableItem = []
    const list_text = text.split("\n")
    let row_index = -1;
    for (let line of list_text) { // 텍스트 행 순회
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) { // 새로운 테이블 행
        row_index++;
        const content = m_line[4]                   // 이 행의 내용
        let level_inline: number = m_line[1].length // 들여쓰기 수
        list_itemInfo.push({
          content: content.trimStart(),
          level: level_inline,
          tableRow: row_index,
          tableColumn: 0,
          type: "",
          tableRowSpan: 1,
        })
      }
      else{ // 기존 테이블 행 (즉, 내부 줄 바꿈 추가)
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(), // modi
            level: itemInfo.level,
            tableRow: itemInfo.tableRow,
            tableColumn: itemInfo.tableColumn,
            type: itemInfo.type,
            tableRowSpan: itemInfo.tableRowSpan,
          })
        }
      }
    }

    // 테이블 열 처리
    let list_itemInfo2:List_LTableItem = []
    for (let row_item of list_itemInfo) { // 테이블 행 순회
      let list_column_item: string[] = row_item.content.split(ABReg.inline_split)
      for (let column_index=0; column_index<list_column_item.length; column_index++) { // 테이블 열 순회
        // 첫 번째 열, 파일 확장자 처리 필요
        let type = "";
        if (column_index==0) {
          if (list_column_item[column_index].trimEnd().endsWith("/")) {
            type = "folder"
          } else {
            const parts = list_column_item[column_index].split('.');
            if (parts.length === 0 || parts[parts.length - 1] === '') type = '';
            else type = parts[parts.length - 1];
          }
        }
        // 채우기
        list_itemInfo2.push({
          content: list_column_item[column_index], // modi
          level: row_item.level,
          tableRow: row_index, // modi
          tableColumn: column_index, // modi
          type: type, // modi
          tableRowSpan: row_item.tableRowSpan,
        })
      }
    }

    return list_itemInfo2
  }

  /** 리스트 테이블 데이터에서 리스트 테이블로 변환
   * 주의: 전달된 리스트 데이터는 다음을 충족해야 함:
   * 첫 번째 열의 레벨은 0, 분기 없음
   */
  static dtdata2dt(
    list_tableInfo: List_LTableItem, 
    div: HTMLDivElement,
    modeT: boolean,
    is_folder=false
  ){
    // GeneratorListTable, 원래 Svelte
    {
      // 테이블 데이터 테이블로 조립
      const table = document.createElement("table"); div.appendChild(table); table.classList.add("ab-table", "ab-list-table")
      if (is_folder) table.classList.add("ab-table-folder")
      if (modeT) table.setAttribute("modeT", "true")

      // 테이블 헤드와 바디 생성
      let thead, tbody
      {
        if(list_tableInfo[0].content.indexOf("< ")==0){ // 테이블 헤드가 있는지 확인
          thead = document.createElement("thead"); table.appendChild(thead);
          list_tableInfo[0].content=list_tableInfo[0].content.replace(/^\<\s/,"")
        }
        tbody = document.createElement("tbody"); table.appendChild(tbody);
      }

      // 테이블 내용 생성
      let tr: HTMLElement // 현재 위치한 테이블 행
      let is_head: boolean = false // 현재 테이블 헤드에 있는지, 아니면 테이블 바디에 있는지
      let prev_tr: HTMLElement|null = null   // 이전 행 캐시, 접을 수 있는지 확인
      for (let cell_index=0; cell_index<list_tableInfo.length; cell_index++) {
        const cell_item = list_tableInfo[cell_index];

        // 테이블 행 생성
        if (cell_item.tableColumn ==0) {
          // 테이블 헤드 행 (즉, 첫 번째 행인지 && 테이블 헤드가 있는지)
          if (cell_index==0 && thead){
            is_head = true
            tr = document.createElement("tr"); thead.appendChild(tr); // attr: {"tr_level": tr_line_level[index_line]}
          }
          // 비 테이블 헤드 행
          else{
            is_head = false
            tr = document.createElement("tr"); tbody.appendChild(tr); 
            // 테이블 헤드에는 일부 속성이 없음
            tr.classList.add("ab-foldable-tr");
            tr.setAttribute("tr_level", cell_item.level.toString()); tr.setAttribute("is_fold", "false"); tr.setAttribute("able_fold", "false");
            tr.setAttribute("type", cell_item.type);
          }
          // 테이블 행의 접을 수 있는 속성 처리. 해당 행의 들여쓰기 수가 더 많으면 이전 항목은 반드시 접을 수 있음. 마지막 항목은 접을 수 없으므로 꼬리 판단 불필요
          if (prev_tr
            && !isNaN(Number(prev_tr.getAttribute("tr_level"))) 
            && Number(prev_tr.getAttribute("tr_level")) < cell_item.level
          ){
            prev_tr.setAttribute("able_fold", "true")
          }
          prev_tr = tr
        }

        // 테이블 셀 생성 (md 버전)
        let td = document.createElement(is_head?"th":"td"); tr!.appendChild(td); td.setAttribute("rowspan", cell_item.tableRowSpan.toString());        
        if (cell_item.tableColumn==0 && is_folder) { // 첫 번째 열, 폴더 처리
          let td_svg = document.createElement("div"); td.appendChild(td_svg); td_svg.classList.add("ab-list-table-svg")
          // 폴더/파일 아이콘 // https://www.w3schools.com/css/css_icons.asp, https://fontawesome.com/
          if (!is_head) {
            if (cell_item.type=="folder") {
              td_svg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>`
              cell_item.content = cell_item.content.slice(0, -1);
            } else {
              td_svg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"/></svg>`
            }
          }
        }
        let td_cell = document.createElement("div"); td.appendChild(td_cell); td_cell.classList.add("ab-list-table-witharrow");
        ABConvertManager.getInstance().m_renderMarkdownFn(cell_item.content, td_cell);
      }

      // 접을 수 있는 리스트 테이블 이벤트 바인딩
      const l_tr:NodeListOf<HTMLElement> = tbody.querySelectorAll("tr")
      for (let i=0; i<l_tr.length; i++){
        const tr = l_tr[i]
        // 1. 두 가지 중 하나 선택, 인라인 onclick 삽입
        // 현재 mdit 사용
        //tr.setAttribute("onclick", `
        //  const tr = this
        //  const l_tr = tr.parentNode.querySelectorAll("tr")
        //  const i = ${i}
        //  const tr_level = Number(tr.getAttribute("tr_level"))
        //  if (isNaN(tr_level)) return
        //  const tr_isfold = tr.getAttribute("is_fold")
        //  if (!tr_isfold) return
        //  let flag_do_fold = false  // 최소 레벨 접기 방지
        //  for (let j=i+1; j<l_tr.length; j++){
        //    const tr2 = l_tr[j]
        //    const tr_level2 = Number(tr2.getAttribute("tr_level"))
        //    if (isNaN(tr_level2)) break
        //    if (tr_level2<=tr_level) break
        //    (tr_isfold == "true") ? tr2.style.display = "" : tr2.style.display = "none"
        //    flag_do_fold = true
        //  }
        //  if (flag_do_fold) tr.setAttribute("is_fold", tr_isfold=="true"?"false":"true")
        //`)
        // 2. 두 가지 중 하나 선택, 정상적인 메서드 바인딩
        // 현재 ob 사용
        tr.onclick = ()=>{
          const tr_level = Number(tr.getAttribute("tr_level"))
          if (isNaN(tr_level)) return
          const tr_isfold = tr.getAttribute("is_fold")
          if (!tr_isfold) return
          let flag_do_fold = false  // 최소 레벨 접기 방지
          for (let j=i+1; j<l_tr.length; j++){
            const tr2 = l_tr[j]
            const tr_level2 = Number(tr2.getAttribute("tr_level"))
            if (isNaN(tr_level2)) break
            if (tr_level2<=tr_level) break
            (tr_isfold == "true") ? tr2.style.display = "" : tr2.style.display = "none"
            flag_do_fold = true
          }
          if (flag_do_fold) tr.setAttribute("is_fold", tr_isfold=="true"?"false":"true")
        }
      }

      // 전체 리스트 테이블 접기 이벤트 바인딩 // TODO, 간소화 및 재사용 가능. tr.onclick(여기에 선택적 매개변수 추가)
      const btn = document.createElement("button"); div.appendChild(btn); btn.textContent="전체 접기/펼치기"; btn.setAttribute("is_fold", "false");
      btn.onclick = ()=>{
        const l_tr:NodeListOf<HTMLElement> = table.querySelectorAll("tr");
        for (let i=0; i<l_tr.length; i++) {
          const tr = l_tr[i]
          ;(()=>{
            const tr_level = Number(tr.getAttribute("tr_level"))
            if (isNaN(tr_level)) return
            const tr_isfold = btn.getAttribute("is_fold"); // [!code] tr->btn
            if (!tr_isfold) return
            let flag_do_fold = false  // 최소 레벨 접기 방지
            for (let j=i+1; j<l_tr.length; j++){
              const tr2 = l_tr[j]
              const tr_level2 = Number(tr2.getAttribute("tr_level"))
              if (isNaN(tr_level2)) break
              if (tr_level2<=tr_level) break
              (tr_isfold == "true") ? tr2.style.display = "" : tr2.style.display = "none"
              flag_do_fold = true
            }
            if (flag_do_fold) tr.setAttribute("is_fold", tr_isfold=="true"?"false":"true")
          })()
        }
        if (btn.getAttribute("is_fold")) {
          btn.setAttribute("is_fold", (btn.getAttribute("is_fold")=="true")?"false":"true")
        }
      }
    }

    return div
  }
}

const abc_list2lt = ABConvert.factory({
  id: "list2lt",
  name: "리스트를 리스트 테이블로 변환",
  match: /list2(md)?lt(T)?/,
  default: "list2lt",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/list2(md)?lt(T)?/)
    if (!matchs) return el
    DirProcess.list2lt(content, el, matchs[2]=="T")
    return el
  }
})

const abc_list2dt = ABConvert.factory({
  id: "list2dt",
  name: "리스트를 트리형 디렉토리로 변환",
  match: /list2(md)?dt(T)?/,
  default: "list2dt",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const matchs = header.match(/list2(md)?dt(T)?/)
    if (!matchs) return el
    DirProcess.list2dt(content, el, matchs[2]=="T")
    return el
  }
})

// =======================================================================

/**
 * ascii 디렉토리 데이터
 * 
 * @detail
 * 탭 문자를 안내하는 데 사용되며, 접두사의 모든 가능성:
 * 1. 루트, 없음
 * 2. 마지막이 아닌 파일, ("│  "/"   ") * n + "├─ "
 * 2. 마지막 파일, ("│  "/"   ") * n + "└─ "
 * 
 * 최적의 테스트 데모: (b21 앞이 올바른지 확인)
 * .
 * ├─ a/
 * ├─ b/
 * │  ├─ b1/
 * │  └─ b2/
 * │     └─ b21
 * └─ c/
 *    └─ c1
 * 
 * 참고 프로젝트: https://github.com/yzhong52/ascii_tree/, 하지만 이 프로젝트는 rust로 작성되었으며, 결국 많이 참고하지 않음
 */
export interface DirListItem extends ListItem {
  type: string;           // 유형 (folder/파일명 확장자)
  is_last: boolean;       // 해당 폴더의 마지막 파일인지 여부
  pre_as_text: string;    // ascii dir에서 이 접두사를 사용함
}[]
export type List_DirListItem = DirListItem[]

/**
   * listdata를 dirdata로 변환
   * 
   * TODO 미완성 with comment 기능
   */
function listdata2dirdata(list: List_ListItem): List_DirListItem {
  // is_have_vbar[x]는 해당 항목 뒤에서 >x의 레벨이 나타날 때까지 x 레벨이 나타날 것임을 나타냄
  // "|  " 또는 "   ", 그리고 "├─ " 또는 "└─ "을 제어하는 데 사용됨
  // 비어 있으면 true로 간주
  let is_have_vbar: boolean[] = [];
  
  let newlist: List_DirListItem = [];
  for (let i=0; i<list.length; i++) {
    let item = list[i];

    // 파일 확장자
    let type: string;
    if (item.content.endsWith("/")) {
      type = "folder"
    } else {
      const parts = item.content.split('.');
      if (parts.length === 0 || parts[parts.length - 1] === '') type = '';
      else type = parts[parts.length - 1];
    }

    // is_last. 여기서 O(n^2) 됨, 최적화 귀찮음
    let is_last = true
    for (let j=i+1; j<list.length; j++) {
      if (list[j].level < item.level) {
        is_last = true; break;
      } else if (list[j].level == item.level) {
        is_last = false; break;
      } else {
        continue
      }
    }
    is_have_vbar[item.level] = !is_last // 예를 들어 루트 디렉토리, is_last = true, is_have_vbar[0] = false로 표시해야 함

    // is_have_vbar를 사용하여 pre_as_text 구성
    let pre_as_text = ""
    if (item.level>1) {
      for (let i = 1; i < item.level; i++) { // 1부터 시작, 루트 레벨에는 vbar 없음
        if (!is_have_vbar.hasOwnProperty(i)) pre_as_text += "[e]" // 일반적으로 이런 상황은 발생하지 않음, 한 레벨에서 두 레벨로 바로 점프하지 않는 한
        else if (is_have_vbar[i]) pre_as_text += "|  "
        else pre_as_text += "   "
      }
    }

    // 새로운 리스트
    newlist.push({
      content: item.content,
      level: item.level,
      type: type,
      is_last: is_last,
      pre_as_text: pre_as_text
    })
  }
  return newlist
}

const abc_list2astreeH = ABConvert.factory({
  id: "list2astreeH",
  name: "리스트를 sacii 디렉토리 트리로 변환",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    let listdata: List_ListItem = ListProcess.list2data(content)
    listdata = ListProcess.data2strict(listdata)
    const dirlistdata: List_DirListItem = listdata2dirdata(listdata)

    let newContent = ""
    for (let item of dirlistdata) {
      if (item.level == 0) {
        newContent += item.content + "\n"
      } else {
        newContent +=
          item.pre_as_text + 
          (item.is_last ? "└─ " : "├─ ") + 
          item.content + "\n"
      }
    }
    newContent = newContent.trimEnd()

    return newContent
  }
})
