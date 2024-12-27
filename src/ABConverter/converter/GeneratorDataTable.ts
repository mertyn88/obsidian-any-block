/// 이건 아마도 정렬 및 필터링 가능한 데이터 테이블을 만들려고 했던 것 같아요.
import {ABConvertManager} from "../ABConvertManager"
/*
import type {List_TableInfo} from "src/ab_converter/converter/listProcess"

export let list_tableInfo:List_TableInfo;
export let modeT:boolean;
export let prev_line: number;

let table:HTMLDivElement;
// 테이블 데이터 테이블로 조립
table.addClasses(["ab-table", "ab-data-table"])
if (modeT) table.setAttribute("modeT", "true")
let thead
if(list_tableInfo[0].content.indexOf("< ")==0){ // 테이블 헤더가 있는지 확인
  thead = table.createEl("thead")
  list_tableInfo[0].content=list_tableInfo[0].content.replace(/^\<\s/,"")
}
const tbody = table.createEl("tbody")
for (let index_line=0; index_line<prev_line+1; index_line++){ // 테이블 행을 순회하며 tr 생성……
  let is_head
  let tr
  if (index_line==0 && thead){ // 첫 번째 행인지 && 테이블 헤더가 있는지 확인
    tr = thead.createEl("tr")
    is_head = true
  }
  else{
    is_head = false
    tr = tbody.createEl("tr")
  }
  for (let item of list_tableInfo){                           // 테이블 열을 순회하며 td 생성
    if (item.tableLine!=index_line) continue
    // md 버전
    let td = tr.createEl(is_head?"th":"td", {
      attr:{"rowspan": item.tableRow}
    })
    ABConvertManager.getInstance().m_renderMarkdownFn(item.content, td)
  }
}
*/
