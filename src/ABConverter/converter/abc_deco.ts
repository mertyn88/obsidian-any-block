/**
 * 처리기_데코레이터 버전
 * 
 * html <-> html
 * md_str <-> html
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"

export const DECOProcessor = 0  // 모듈화를 위해 사용, 오류 방지용, 사실 별로 쓸모 없음

const abc_md = ABConvert.factory({
  id: "md",
  name: "md",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    const subEl = document.createElement("div"); el.appendChild(subEl);
    ABConvertManager.getInstance().m_renderMarkdownFn(content, subEl)
    return el
  }
})

const abc_text = ABConvert.factory({
  id: "text",
  name: "순수 텍스트",
  detail: "사실 일반적으로 code()를 사용하는 것이 더 정확함",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    // 텍스트 요소. pre는 사용하기 불편하여 여기서는 <br>로 줄바꿈하는 것이 가장 좋음
    el.innerHTML = `<p>${content.replace(/ /g, "&nbsp;").split("\n").join("<br/>")}</p>`
    return el
  }
})

const abc_fold = ABConvert.factory({
  id: "fold",
  name: "접기",
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{
    if(content.children.length!=1) return content
    const sub_el = content.children[0] as HTMLElement
    sub_el.remove()
    sub_el.setAttribute("is_hide", "true")
    sub_el.classList.add("ab-deco-fold-content")
    sub_el.style.display = "none"
    const mid_el = document.createElement("div"); content.appendChild(mid_el); mid_el.classList.add("ab-deco-fold");
    const sub_button = document.createElement("div"); mid_el.appendChild(sub_button); sub_button.classList.add("ab-deco-fold-button"); sub_button.textContent = "펼치기";
    sub_button.onclick = ()=>{
      const is_hide = sub_el.getAttribute("is_hide")
      if (is_hide && is_hide=="false") {
        sub_el.setAttribute("is_hide", "true"); 
        sub_el.style.display = "none"
        sub_button.textContent = "펼치기"
      }
      else if(is_hide && is_hide=="true") {
        sub_el.setAttribute("is_hide", "false");
        sub_el.style.display = ""
        sub_button.textContent = "접기"
      }
    }
    mid_el.appendChild(sub_button)
    mid_el.appendChild(sub_el)
    return content
  }
})


const abc_scroll = ABConvert.factory({
  id: "scroll",
  name: "스크롤",
  match: /^scroll(\((\d+)\))?(T)?$/,
  default: "scroll(460)",
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{
    // 매개변수 찾기
    const matchs = header.match(/^scroll(\((\d+)\))?(T)?$/)
    if (!matchs) return content
    let arg1
    if (!matchs[1]) arg1=460  // 기본값
    else{
      if (!matchs[2]) return content
      arg1 = Number(matchs[2])
      if (isNaN(arg1)) return content
    }
    // 요소 수정
    if(content.children.length!=1) return content
    const sub_el = content.children[0]
    sub_el.remove()
    const mid_el = document.createElement("div"); content.appendChild(mid_el); mid_el.classList.add("ab-deco-scroll");
    if (!matchs[3]){
      mid_el.classList.add("ab-deco-scroll-y")
      mid_el.setAttribute("style", `max-height: ${arg1}px`)
    } else {
      mid_el.classList.add("ab-deco-scroll-x")
    }
    mid_el.appendChild(sub_el)
    return content
  }
})

const abc_overfold = ABConvert.factory({
  id: "overfold",
  name: "초과 접기",
  match: /^overfold(\((\d+)\))?$/,
  default: "overfold(380)",
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{
    // 매개변수 찾기
    const matchs = header.match(/^overfold(\((\d+)\))?$/)
    if (!matchs) return content
    let arg1:number
    if (!matchs[1]) arg1=460  // 기본값
    else{
      if (!matchs[2]) return content
      arg1 = Number(matchs[2])
      if (isNaN(arg1)) return content
    }
    // 요소 수정
    if(content.children.length!=1) return content
    const sub_el = content.children[0]
    sub_el.remove()
    const mid_el = document.createElement("div"); content.appendChild(mid_el); mid_el.classList.add("ab-deco-overfold");
    const sub_button = document.createElement("div"); mid_el.appendChild(sub_button); sub_button.classList.add("ab-deco-overfold-button"); sub_button.textContent = "펼치기";
    sub_el.classList.add("ab-deco-overfold-content")
    mid_el.appendChild(sub_el)
    mid_el.appendChild(sub_button)

    mid_el.setAttribute("style", `max-height: ${arg1}px`)
    mid_el.setAttribute("is-fold", "true")
    sub_button.onclick = ()=>{
      const is_fold = mid_el.getAttribute("is-fold")
      if (!is_fold) return
      if (is_fold=="true") {
        mid_el.setAttribute("style", "")
        mid_el.setAttribute("is-fold", "false")
        sub_button.textContent = "접기"
      }
      else{
        mid_el.setAttribute("style", `max-height: ${arg1}px`)
        mid_el.setAttribute("is-fold", "true")
        sub_button.textContent = "펼치기"
      }
    }

    return content
  }
})

  // 다음과 같이 매칭 가능:
  // width(25%,25%,50%)
  // width(100px,10rem,10.5) 
  // width(100)
  const abc_width = ABConvert.factory({
    id: "width",
    name: "너비 제어",
    match: /^width\(((?:\d*\.?\d+(?:%|px|rem)?,\s*)*\d*\.?\d+(?:%|px|rem)?)\)$/,
    process_param: ABConvert_IOEnum.el,
    process_return: ABConvert_IOEnum.el,
    process: (el, header, content: HTMLElement): HTMLElement=>{
      const matchs = header.match(/^width\(((?:\d*\.?\d+(?:%|px|rem)?,\s*)*\d*\.?\d+(?:%|px|rem)?)\)$/)
      if (!matchs || content.children.length!=1) return content
  
      // %와 px 두 가지 단위를 지원하며, 기본 단위는 px
      const args = matchs[1].split(",").map(arg => 
        /^\d*\.?\d+$/.test(arg.trim()) ? `${arg.trim()}%` : arg.trim()
      )
      // 컨테이너가 처리해야 할 클래스 이름을 포함하고 있는지 확인하고, 다른 컨테이너에 따라 처리 방식이 다름
      switch(true){
        // ab-col은 혼합 단위 매개변수 렌더링을 지원
        case content.children[0].classList.contains('ab-col'): {
          const sub_els = content.children[0].children
          if(sub_els.length==0) return content
          // 매개변수 수와 열 수가 일치하지 않아도 허용, 초과 부분은 무시됨 
          for(let i=0;i<Math.min(sub_els.length, args.length);i++){
            const sub_el = sub_els[i] as HTMLElement
            if(args[i].endsWith("%")) sub_el.style.flex = `0 1 ${args[i]}`
            else {
              sub_el.style.width = args[i]
              sub_el.style.flex = `0 0 auto`
            }
          }
          return content
        }
        /**
         * table은 현재 혼합 단위 매개변수를 잘 렌더링할 수 없음 (px와 rem은 혼합 가능)
         * settimeout으로 테이블 너비를 지연하여 가져오면 해결 가능하지만, 렌더링 시간이 길어짐
         * grid 레이아웃으로 변경 시도 가능
         */
        // 비율 단위를 사용하면 매개변수 수와 열 수가 일치하도록 하는 것이 좋으며, 비율 단위를 사용하면 테이블이 행 너비에 맞게 비율로 늘어남
        case content.children[0].querySelector('table') !== null: {
          const table = content.children[0].querySelector('table')
          if (!table) return content
          table.style.tableLayout = 'fixed'
          // % 단위의 매개변수가 있는지 확인하고, 100%를 사용하고, 그렇지 않으면 fit-content를 사용
          table.style.width = args.some(arg => arg.endsWith('%')) ? '100%' : 'fit-content'
          // setTimeout(() => {
          //   console.log('Table width:', table.offsetWidth);
          //   console.log('Computed width:', window.getComputedStyle(table).width);
          // }, 10);
          table.querySelectorAll('tr').forEach(row => {
            for (let i = 0; i < Math.min(row.children.length, args.length); i++) {
              const cell = row.children[i] as HTMLElement
              cell.style.width = cell.style.minWidth = cell.style.maxWidth = args[i]
            }
          })
          return content
        }
        default:
          return content
      }
    }
  })

const abc_addClass = ABConvert.factory({
  id: "addClass",
  name: "클래스 추가",
  detail: "현재 블록에 클래스 이름 추가",
  match: /^addClass\((.*)\)$/,
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{
    const matchs = header.match(/^addClass\((.*)\)$/)
    if (!matchs || !matchs[1]) return content
    if(content.children.length!=1) return content
    const sub_el = content.children[0]
    sub_el.classList.add(String(matchs[1]))
    return content
  }
})

const abc_addDiv = ABConvert.factory({
  id: "addDiv",
  name: "div와 클래스 추가",
  detail: "현재 블록에 부모 클래스를 추가하며, 이 부모 클래스에 클래스 이름을 부여해야 함",
  match: /^addDiv\((.*)\)$/,
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{
    const matchs = header.match(/^addDiv\((.*)\)$/)
    if (!matchs || !matchs[1]) return content
    const arg1 = matchs[1]
    // 요소 수정
    if(content.children.length!=1) return content
    const sub_el = content.children[0]
    sub_el.remove()
    const mid_el = document.createElement("div"); content.appendChild(mid_el); mid_el.classList.add(arg1)
    mid_el.appendChild(sub_el)
    return content
  }
})

const abc_title = ABConvert.factory({
  id: "title",
  name: "제목",
  match: /^#(.*)/,
  detail: "코드나 테이블 블록을 직접 처리할 경우, 특별한 스타일이 적용됨",
  process_param: ABConvert_IOEnum.el,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: HTMLElement): HTMLElement=>{ // content에 특별한 클래스가 있어, 변경할 수 없음. 그 아래에 껍질을 씌워야 함
    const matchs = header.match(/^#(.*)/)
    if (!matchs || !matchs[1]) return content
    const arg1 = matchs[1]

    // 요소 수정 - 기존 요소를 문서 트리에서 제거
    const el_content = document.createElement("div");
    while (content.firstChild) {
      const item = content.firstChild;
      content.removeChild(item)
      el_content.appendChild(item)
    }
    // 요소 수정 - 구조 재구성
    const el_root = document.createElement("div"); content.appendChild(el_root); el_root.classList.add("ab-deco-title");
    const el_title = document.createElement("div"); el_root.appendChild(el_title); el_title.classList.add("ab-deco-title-title");
    const el_title_p = document.createElement("p"); el_title.appendChild(el_title_p); el_title_p.textContent = arg1;
    el_root.appendChild(el_content); el_content.classList.add("ab-deco-title-content");

    // 요소 유형에 따라 제목 스타일 수정 // TODO 혼합은 첫 번째를 사용해야 하는지 아니면 그냥 none을 사용해야 하는지? 일단 첫 번째를 사용, 왜냐하면 나중에 도구 모음 등이 있을 수 있음
    let el_content_sub = el_content.childNodes[0]; if (!el_content_sub) return content;
    if (el_content_sub instanceof HTMLDivElement && el_content.childNodes.length == 1 && el_content.childNodes[0].childNodes[0]) { el_content_sub = el_content.childNodes[0].childNodes[0] } // 재렌더링인 경우, 한 단계 더 아래로
    let title_type = "none"
    if (el_content_sub instanceof HTMLQuoteElement){title_type = "quote"
      // 여기서 callout 스타일을 차용
      el_root.classList.add("callout")
      el_title.classList.add("callout-title");
      el_content.classList.add("callout-content");
      // 원래의 인용 블록 스타일 제거
      const el_content_sub_parent =  el_content_sub.parentNode; if (!el_content_sub_parent) return content
      while (el_content_sub.firstChild) {
        el_content_sub_parent.insertBefore(el_content_sub.firstChild, el_content_sub);
      }
      el_content_sub_parent.removeChild(el_content_sub)
    }
    else if (el_content_sub instanceof HTMLTableElement){title_type = "table"}
    else if (el_content_sub instanceof HTMLUListElement){title_type = "ul"}
    else if (el_content_sub instanceof HTMLPreElement){title_type = "pre"}
    el_title.setAttribute("title-type", title_type)
    return content
  }
})
