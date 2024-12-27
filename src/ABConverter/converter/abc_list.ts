/**
 * 처리기_리스트 버전
 * 
 * - md_str <-> 리스트 데이터
 * - 리스트 데이터 <-> html
 * - 테이블 데이터 -> 리스트 데이터
 */

import { ABReg } from '../ABReg'
import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"

/**
 * 일반적인 리스트 데이터, 하나의 요소는 하나의 리스트 항목과 같음
 * 
 * 예:
 * - a1
 *   - a2
 *   - a3
 * to
 * {
 *   {a1, 0},
 *   {a2, 2},
 *   {a3, 2},
 * }
 * to (정규화)
 * {
 *   {a1, 0},
 *   {a2, 1},
 *   {a3, 1},
 * }
 */
export interface ListItem {
  content: string;        // 내용
  level: number;          // 레벨 (들여쓰기 공백 수/정규화 후 증가 레벨 수)
}[]
export type List_ListItem = ListItem[]

// 리스트 노드 구조
export type listNodes = {
  content: string;
  children: listNodes[];
}

/// 몇 가지 리스트 관련 도구 모음
export class ListProcess{

  // ----------------------- str -> listData ------------------------

  /** 
   * 리스트 텍스트를 리스트 데이터로 변환
   * @bug 들여쓰기를 넘을 수 없음, 나중에 비정상적인 들여쓰기를 수정할 예정
   * @bug 내부 줄바꿈 ` | `에 버그가 있을 수 있음
   * @param modeG: 식별 기호 ` | `（이 옵션은 현재 사용할 수 없음, 0은 인식하지 않음, 1은 하위 레벨로 인식, 2는 동일 레벨로 인식, ultable로 변환할 때 옵션 2를 사용함）
   */
  static list2data(text: string, modeG=true){
    /** 인라인 보상 리스트. comp>0인 항목만 유지 */
    let list_inline_comp:{
      level:number,
      inline_comp:number
    }[] = []
    /** list_level_inline의 상태를 업데이트하고 해당 항목의 보상 값을 반환
     * 프로세스: 왼쪽으로 소급한 다음 자신을 추가
     */
    function update_inline_comp(
      level:number, 
      inline_comp:number
    ): number{
      // ` | ` 명령을 전혀 사용하지 않으면 건너뜀
      if (list_inline_comp.length==0 && inline_comp==0) return 0

      // 왼쪽으로 소급 (왼쪽에 있을 때)하여 자신이 보상 리스트의 오른쪽에 있을 때까지
      while(list_inline_comp.length && list_inline_comp[list_inline_comp.length-1].level>=level){
        list_inline_comp.pop()
      }
      if (list_inline_comp.length==0 && inline_comp==0) return 0 // 조기 종료

      // 총 보상 값 계산 (자신 제외)
      let total_comp
      if (list_inline_comp.length==0) total_comp = 0
      else total_comp = list_inline_comp[list_inline_comp.length-1].inline_comp

      // 자신을 추가
      if (inline_comp>0) list_inline_comp.push({
        level: level, 
        inline_comp: inline_comp+total_comp
      })

      return total_comp
    }

    // 리스트 텍스트를 리스트 데이터로 변환
    let list_itemInfo:List_ListItem = []

    const list_text = text.split("\n")
    for (let line of list_text) {                                             // 각 줄
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) {
        let list_inline: string[] = m_line[4].split(ABReg.inline_split) // 인라인 줄바꿈
        /** @bug  탭 길이는 1이 아니라 4임 */
        let level_inline: number = m_line[1].length
        let inline_comp = update_inline_comp(level_inline, list_inline.length-1)
                                                                              // 들여쓰기 유지하지 않음 (일반 트리 테이블)
        for (let index=0; index<list_inline.length; index++){
          list_itemInfo.push({
            content: list_inline[index],
            level: level_inline+index+inline_comp
          })
        }
      }
      else{                                                                   // 내부 줄바꿈
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(),
            level: itemInfo.level
          })
        }
      }
    }
    return list_itemInfo
  }

  /**
   * listStream 구조를 트리 구조로 변환
   * 
   * @detail
   * list2data와 달리 여기서는 `: `만 구분자로 인식
   * 
   * @param text
   * @return
   * {
   *   content: string;        // 내용
   *   level: number;          // 레벨 (들여쓰기 공백 수)
   * }
   * to
   * {
   *   content: string
   *   children: []
   * }
   */
  static list2listnode(text: string): listNodes[]{
    let data: List_ListItem = ListProcess.list2data(text, false)
    data = ListProcess.data2strict(data)
    let nodes: listNodes[] = []
    let prev_nodes: listNodes[] = [] // 각 레벨의 최신 노드를 캐시

    let current_data: listNodes
    for (let index = 0; index<data.length; index++) {
      // 현재 노드
      const item = data[index]
      current_data = {
        content: item.content,
        children: []
      }
      prev_nodes[item.level] = current_data

      // 노드 트리의 적절한 위치에 삽입
      if (item.level>=1 && prev_nodes.hasOwnProperty(item.level-1)) {
        prev_nodes[item.level-1].children.push(current_data)
      } else if (item.level==0) {
        nodes.push(current_data)
      } else {
        console.error(`list 데이터가 규격에 맞지 않음, 정규화되지 않음. level:${item.level}, prev_nodes:${prev_nodes}`)
        return nodes
      }
    }
    return nodes
  }

  static list2json(text: string): object{
    interface NestedObject {              // 재귀 가능한 노드 타입
      [key: string]: NestedObject | string | number | any[];
    }
    let data: List_ListItem = ListProcess.list2data(text, false)
    data = ListProcess.data2strict(data)
    let nodes: NestedObject = {}         // 노드 트리
    let prev_nodes: NestedObject[] = []  // 각 레벨의 최신 노드를 캐시

    // 첫 번째 변환, 모든 노드는 "key": {...} 형식
    for (let index = 0; index<data.length; index++) {
      // 현재 노드
      const item = data[index]
      const current_key: string = item.content
      const current_value: NestedObject = {}
      prev_nodes[item.level] = current_value

      // 노드 트리의 적절한 위치에 삽입
      if (item.level>=1 && prev_nodes.hasOwnProperty(item.level-1)) {
        let lastItem = prev_nodes[item.level-1]
        if (typeof lastItem != "object" || Array.isArray(lastItem)) {
          console.error(`list 데이터가 규격에 맞지 않음, 부모 노드의 value 값이 {} 타입이 아님`)
          return nodes
        }
        lastItem[current_key] = current_value
      } else if (item.level==0) {
        nodes[current_key] = current_value
      } else {
        console.error(`list 데이터가 규격에 맞지 않음, 정규화되지 않음. level:${item.level}, prev_nodes:${prev_nodes}`)
        return nodes
      }
    }

    // 두 번째, 세 번째 변환
    let nodes2: NestedObject = nodes
    traverse(nodes2)

    return nodes2

    /**
     * json을 재귀적으로 순회하여 obj를 두 번 변환
     * 
     * @detail
     * - 노드 "k:v": {빈}을 "k": "v"로 확장
     * - 일부를 리스트로 변환
     * 
     * @param
     * 마지막 두 매개변수는 전체 obj를 교체하기 쉽게 하기 위함, 그렇지 않으면 주소가 변하지 않는 전제에서 배열을 obj로 교체하는 것이 매우 번거로움
     */
    function traverse(obj: NestedObject|any[], objSource?:any, objSource2?:string) {
      if (Array.isArray(obj)) return
      
      // 변환: 노드 "k:v": {빈}을 "k": "v"로 확장
      const keys = Object.keys(obj)
      let count_null = 0
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]; if (!obj.hasOwnProperty(key)) continue;
        const value = obj[key]
        if (typeof value === 'object' && !Array.isArray(value)) {  // (b1) 객체
          if (Object.keys(value).length === 0) {  // (b11) k-v 확장
            let index = key.indexOf(": ");
            if (index > 0) {
              delete obj[key]; i--; // @warn 새로 삽입된 k-v가 뒤에 있기를 희망, 그렇지 않으면 순서 문제가 매우 심각함
              obj[key.slice(0, index)] = key.slice(index+1)
            } else {
              obj[key] = ""
              count_null++
            }
          } else {                                // (b12) 재귀 호출
            traverse(value, obj, key);
          }
        } else {                                  // (b2) 비객체/배열 객체
        }
      }

      // 변환: 꼬리 판단, 요구를 충족하는 json을 리스트로 변환
      if (objSource && objSource2) {
        let newObj: (string|number|{})[] = []
        if (count_null == keys.length) {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i]; if (!obj.hasOwnProperty(key)) continue;
            newObj.push(key)
          }
          objSource[objSource2] = newObj
        }
      }
    }
  }

  /**
   * 제목 개요를 리스트 데이터로 변환 (@todo 본문의 level+10, 빼야 함)
   * 
   * @detail
   * 여기서는 제목, 본문, 리스트의 레벨을 하나로 합쳐야 하므로 오프셋 값이 존재:
   * 
   * 1. 제목 레벨,  = `#` 개수-10,    값 범위[-9,-4]
   * 2. 본문 레벨,  = 0,              값 범위[+1,+Infi]
   * 3. 리스트 레벨,  = `(.*)-` 개수+1,  값 범위[0]
   * 
   */
  static title2data(text: string){
    let list_itemInfo:List_ListItem = []

    const list_text = text.split("\n")
    let mul_mode:"heading"|"para"|"list"|"" = ""                // 다중 행 모드, 제목/본문/리스트/빈
    for (let line of list_text) {
      const match_heading = line.match(ABReg.reg_heading_noprefix)
      const match_list = line.match(ABReg.reg_list_noprefix)
      if (match_heading && !match_heading[1]){                // 1. 제목 레벨 (루트에서만 인식)
        removeTailBlank()
        list_itemInfo.push({
          content: match_heading[4],
          level: (match_heading[3].length-1)-10
        })
        mul_mode = "heading"
      }
      else if (match_list){                                   // 2. 리스트 레벨 ~~(루트에서만 인식)~~
        removeTailBlank()
        list_itemInfo.push({
          content: match_list[4],
          level: match_list[1].length+1//+10
        })
        mul_mode = "list"
      }
      else if (/^\S/.test(line) && mul_mode=="list"){         // 3. 들여쓰기가 있고 리스트 레벨에 있는 경우
        list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content+"\n"+line
      }
      else {                                                  // 4. 본문 레벨
        if (mul_mode=="para") {
          list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content+"\n"+line
        }
        else if(/^\s*$/.test(line)){
          continue
        }
        else{
          list_itemInfo.push({
            content: line,
            level: 0//+10
          })
          mul_mode = "para"
        }
      }
    }
    removeTailBlank()
    return list_itemInfo

    function removeTailBlank(){
      if (mul_mode=="para"||mul_mode=="list"){
        list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content.replace(/\s*$/, "")
      }
    }
  }

  // 이 유형의 리스트는 두 개의 레벨만 가짐
  private static old_ulist2data(text: string){
    // 리스트 텍스트를 리스트 데이터로 변환
    let list_itemInfo:List_ListItem = []

    let level1 = -1
    let level2 = -1
    const list_text = text.split("\n")
    for (let line of list_text) {                                             // 각 줄
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) {
        let level_inline: number = m_line[1].length
        let this_level: number                                    // 총 세 가지 가능성: 1, 2, 3, 3은 다른 레벨을 나타냄
        if (level1<0) {level1=level_inline; this_level = 1}       // level1이 설정되지 않음
        else if (level1>=level_inline) this_level = 1             // level1임
        else if (level2<0) {level2=level_inline; this_level = 2}  // level2가 설정되지 않음
        else if (level2>=level_inline) this_level = 2             // level2임
        else {                                                    // 내부 줄바꿈
          let itemInfo = list_itemInfo.pop()
          if(itemInfo){
            list_itemInfo.push({
              content: itemInfo.content+"\n"+line.trim(),
              level: itemInfo.level
            })
          }
          continue
        }
        list_itemInfo.push({
          content: m_line[4],
          level: this_level
        })
      }
      else{                                                                   // 내부 줄바꿈
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(),
            level: itemInfo.level
          })
        }
      }
    }

    // 두 레벨 트리를 단일 레벨 트리로 변환
    let count_level_2 = 0
    for (let item of list_itemInfo){
      if (item.level==2){
        item.level += count_level_2
        count_level_2++
      }
      else {
        count_level_2 = 0
      }
    }
    
    return list_itemInfo
  }

  /**
   * 리스트 데이터 정규화/정규화
   * 
   * 주로 레벨 조정: 공백 수를 증가 레벨로 조정하고 2를 곱함
   */
  static data2strict(
    list_itemInfo: List_ListItem
  ): List_ListItem {
    let list_prev_level:number[] = [-999]
    let list_itemInfo2:List_ListItem = []
    for (let itemInfo of list_itemInfo){
      // list_prev_level의 위치를 찾아 new_level로 저장
      let new_level = 0
      for (let i=0; i<list_prev_level.length; i++){
        if (list_prev_level[i]<itemInfo.level) continue // 오른쪽으로 이동
        else if(list_prev_level[i]==itemInfo.level){    // 중지하고 이전의 오른쪽 데이터를 제거
          list_prev_level=list_prev_level.slice(0,i+1)
          new_level = i
          break
        }
        else {                                          // 두 개 사이에 있는 경우, 해당 레벨을 오른쪽의 것으로 간주하고 이전의 오른쪽 데이터를 제거
          list_prev_level=list_prev_level.slice(0,i)
          list_prev_level.push(itemInfo.level)
          new_level = i
          break
        }
      }
      if (new_level == 0) { // 루프 끝 호출
        list_prev_level.push(itemInfo.level)
        new_level = list_prev_level.length-1
      }
      // 리스트 데이터 업데이트. 여기서는 깊은 복사가 필요하며 원래 배열을 직접 수정하지 않음, 디버깅을 용이하게 하고 오류를 방지하기 위함
      list_itemInfo2.push({
        content: itemInfo.content,
        level: (new_level-1) // 레벨을 계산할 때 시퀀스 0의 자리 요소를 빼야 함을 기억
      })
    }
    return list_itemInfo2
  }

  /** 두 레벨 트리를 다층 단일 레벨 트리로 변환 
   * 예:
   * - 1
   *  - 2
   *  - 3
   * to:
   * - 1
   *  - 2
   *   - 3
   */
  static data_2L_2_mL1B(
    list_itemInfo: List_ListItem
  ){
    let list_itemInfo2:List_ListItem = []
    let count_level_2 = 0
    for (let item of list_itemInfo){
      if (item.level!=0){                     // 두 번째 레벨에 있으며, 레벨을 순차적으로 증가
        // item.level += count_level_2
        list_itemInfo2.push({
          content: item.content,
          level: item.level+count_level_2
        })
        count_level_2++
      }
      else {                                  // 첫 번째 레벨에 있음
        list_itemInfo2.push({
          content: item.content,
          level: item.level
        })
        count_level_2 = 0
      }
    }
    return list_itemInfo2
  }

  /**
   * 리스트 데이터를 리스트로 변환 (겉보기에 불필요한 작업 같지만, 때로는 디버깅에 필요함)
   * 
   * - title2list에서 사용됨
   * - 요령: list2data + data2list = listXinline
   */
  static data2list(
    list_itemInfo: List_ListItem
  ){
    let list_newcontent:string[] = [] // 전달된 매개변수는 리스트 항목 단위, 이 매개변수는 행 단위
    // 각 레벨의 content 처리
    for (let item of list_itemInfo){
      const str_indent = " ".repeat(item.level) // 들여쓰기 수
      let list_content = item.content.split("\n") // 하나의 리스트 항목에 여러 줄이 있을 수 있음
      for (let i=0; i<list_content.length; i++) {
        if(i==0) list_newcontent.push(str_indent+"- "+list_content[i])
        else list_newcontent.push(str_indent+"  "+list_content[i])
      }
    }
    const newcontent = list_newcontent.join("\n")
    return newcontent
  }

  /** 
   * 다중 열 리스트를 `노드` 구조로 변환
   * 
   * .ab-nodes
   *   .ab-nodes-node
   *     .ab-nodes-content
   *     .ab-nodes-children
   *       (재귀 포함)
   *       .ab-nodes-node
   *       .ab-nodes-node
   */
  static data2nodes(listdata:List_ListItem, el:HTMLElement): HTMLElement {
    const el_root = document.createElement("div"); el.appendChild(el_root); el_root.classList.add("ab-nodes")
    const el_root2 = document.createElement("div"); el_root.appendChild(el_root2); el_root2.classList.add("ab-nodes-children") // 특징은 대응하는 content와 bracket이 없음
    let cache_els:{node: HTMLElement, content: HTMLElement, children: HTMLElement}[] = []  // 각 레벨의 최신 노드를 캐시 (레벨 0의 노드는 시퀀스 0에 있음), 루트 노드는 별도로 처리
    
    for (let item of listdata) {
      // 노드 준비
      const el_node = document.createElement("div"); el_node.classList.add("ab-nodes-node"); el_node.setAttribute("has_children", "false"); // false인 경우: chileren이 표시되지 않음, content 선이 짧음
      const el_node_content = document.createElement("div"); el_node.appendChild(el_node_content); el_node_content.classList.add("ab-nodes-content");
      ABConvertManager.getInstance().m_renderMarkdownFn(item.content, el_node_content)
      const el_node_children = document.createElement("div"); el_node.appendChild(el_node_children); el_node_children.classList.add("ab-nodes-children");
      const el_node_barcket = document.createElement("div"); el_node_children.appendChild(el_node_barcket); el_node_barcket.classList.add("ab-nodes-bracket");
      const el_node_barcket2 = document.createElement("div"); el_node_children.appendChild(el_node_barcket2); el_node_barcket2.classList.add("ab-nodes-bracket2");
      cache_els[item.level] = {node: el_node, content: el_node_content, children: el_node_children}
      
      // 노드를 적절한 위치에 삽입
      if (item.level == 0) { // 부모 노드는 트리의 루트 노드
        el_root2.appendChild(el_node)
      } else if (item.level >= 1 && cache_els.hasOwnProperty(item.level-1)) {
        cache_els[item.level-1].children.appendChild(el_node)
        cache_els[item.level-1].node.setAttribute("has_children", "true") // 마지막 괄호를 숨겨야 함
      }
      else {
        console.error("노드 오류")
        return el
      }
    }
    return el
  }
}

export const abc_list2listdata = ABConvert.factory({
  id: "list2listdata",
  name: "리스트에서 listdata로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.list_strem,
  detail: "리스트에서 listdata로",
  process: (el, header, content: string): List_ListItem=>{
    return ListProcess.list2data(content) as List_ListItem
  }
})

export const abc_title2listdata = ABConvert.factory({
  id: "title2listdata",
  name: "제목에서 listdata로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.list_strem,
  detail: "제목에서 listdata로",
  process: (el, header, content: string): List_ListItem=>{
    return ListProcess.title2data(content) as List_ListItem
  }
})

const abc_listdata2list = ABConvert.factory({
  id: "listdata2list",
  name: "listdata에서 리스트로",
  process_param: ABConvert_IOEnum.list_strem,
  process_return: ABConvert_IOEnum.text,
  detail: "listdata에서 리스트로",
  process: (el, header, content: List_ListItem): string=>{
    return ListProcess.data2list(content) as string
  }
})

const abc_listdata2nodes = ABConvert.factory({
  id: "listdata2nodes",
  name: "listdata에서 노드로",
  process_param: ABConvert_IOEnum.list_strem,
  process_return: ABConvert_IOEnum.el,
  detail: "listdata에서 노드로",
  process: (el, header, content: List_ListItem): HTMLElement=>{
    return ListProcess.data2nodes(content, el) as HTMLElement
  }
})

const abc_listdata2strict = ABConvert.factory({
  id: "listdata2strict",
  name: "listdata 정규화",
  process_param: ABConvert_IOEnum.list_strem,
  process_return: ABConvert_IOEnum.list_strem,
  process: (el, header, content: List_ListItem): List_ListItem=>{
    return ListProcess.data2strict(content)
  }
})

export const abc_list2listnode = ABConvert.factory({
  id: "list2listnode",
  name: "리스트에서 listnode로 (beta)",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.json,
  detail: "리스트에서 listnode로",
  process: (el, header, content: string): string=>{
    const data: listNodes[] = ListProcess.list2listnode(content)
    return JSON.stringify(data, null, 2) // TMP
  }
})

export const abc_list2json = ABConvert.factory({
  id: "list2json",
  name: "리스트에서 json으로 (beta)",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.json,
  detail: "리스트에서 json으로",
  process: (el, header, content: string): string=>{
    const data: object = ListProcess.list2json(content)
    return JSON.stringify(data, null, 2) // TMP
  }
})
