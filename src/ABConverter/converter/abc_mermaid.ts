/**
 * AB 변환기 - mermaid 관련
 * 
 * (선택 사항) 참고: Ob 플러그인에 7.1MB 추가
 * 
 * 사용 주의 사항: ob/mdit에서의 작성법이 다릅니다. 이 파일에서 render_mermaidText 함수를 검색하세요. 세 가지 전략이 있습니다. ob는 전략 1을 추천하고, mdit는 전략 3을 추천합니다.
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {ListProcess, type List_ListItem} from "./abc_list"
import {ABReg} from "../ABReg"

// mermaid 관련 - 여기서 직접 렌더링해야 합니다.
import mermaid from "mermaid"
import mindmap from '@mermaid-js/mermaid-mindmap';
const initialize = mermaid.registerExternalDiagrams([mindmap]);
export const mermaid_init = async () => {
  await initialize;
};

/**
 * 랜덤 id 생성
 * 
 * @detail mermaid 렌더링 블록에는 id가 필요합니다. 그렇지 않으면 여러 mermaid 블록이 충돌할 수 있습니다.
 */
function getID(length=16){
  return Number(Math.random().toString().substr(3,length) + Date.now()).toString(36);
}

// 순수 조합, 이후 별칭 모듈로 대체 예정
const abc_title2mindmap = ABConvert.factory({
  id: "title2mindmap",
  name: "제목에서 마인드맵으로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: async (el, header, content: string): Promise<HTMLElement>=>{
    const data = ListProcess.title2data(content) as List_ListItem
    const el2 = await data2mindmap(data, el)
    return el2
  }
})

// 순수 조합, 이후 별칭 모듈로 대체 예정
const abc_list2mindmap = ABConvert.factory({
  id: "list2mindmap",
  name: "리스트를 mermaid 마인드맵으로 변환",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: async (el, header, content: string): Promise<HTMLElement>=>{
    const data = ListProcess.list2data(content) as List_ListItem
    const el2 = await data2mindmap(data, el)
    return el2
  }
})

const abc_list2mermaid = ABConvert.factory({
  id: "list2mermaid",
  name: "리스트를 mermaid 플로우차트로 변환",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    list2mermaid(content, el)
    return el
  }
})

const abc_mermaid = ABConvert.factory({
  id: "mermaid",
  name: "새로운 mermaid",
  match: /^mermaid(\((.*)\))?$/,
  default: "mermaid(graph TB)",
  detail: "마인드맵과의 호환성을 위해, 여기서는 플러그인에 내장된 최신 버전의 mermaid를 사용합니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: async (el, header, content: string): Promise<HTMLElement>=>{
    let matchs = content.match(/^mermaid(\((.*)\))?$/)
    if (!matchs) return el
    if (matchs[1]) content = matchs[2]+"\n"+content
    const el2 = render_mermaidText(content, el)
    return el2
  }
})

// ----------- list and mermaid ------------

/** 리스트를 mermaid 플로우차트로 변환 */
function list2mermaid(text: string, div: HTMLDivElement) {
  let list_itemInfo = ListProcess.list2data(text)
  let mermaidText = data2mermaidText(list_itemInfo)
  return render_mermaidText(mermaidText, div)
}

/** 리스트 데이터를 mermaid 플로우차트로 변환
 * ~~@bug 구버전 버그(내장된 mermaid 없음)로 인해 깜빡임 발생~~ 
 * 그리고 mermaid의 (항목)에는 공백이나 잘못된 문자가 없어야 합니다. 공백은 처리했지만, 문자는 처리하지 않았습니다. 아니, 공백도 처리하지 않겠습니다.
 */
function data2mermaidText(
  list_itemInfo: List_ListItem
){
  const html_mode = false    // @todo 이 스위치를 전환할 설정은 아직 없습니다.

  let list_line_content:string[] = ["graph LR"]
  // let list_line_content:string[] = html_mode?['<pre class="mermaid">', "graph LR"]:["```mermaid", "graph LR"]
  let prev_line_content = ""
  let prev_level = 999
  for (let i=0; i<list_itemInfo.length; i++){
    if (list_itemInfo[i].level>prev_level){ // 오른쪽으로 정상적으로 화살표 추가
      prev_line_content = prev_line_content+" --> "+list_itemInfo[i].content//.replace(/ /g, "_")
    } else {                                // 줄 바꿈, 그리고……
      list_line_content.push(prev_line_content)
      prev_line_content = ""

      for (let j=i; j>=0; j--){             // 자신보다 큰 항목으로 돌아감
        if(list_itemInfo[j].level<list_itemInfo[i].level) {
          prev_line_content = list_itemInfo[j].content//.replace(/ /g, "_")
          break
        }
      }
      if (prev_line_content) prev_line_content=prev_line_content+" --> "  // 자신보다 큰 항목이 있는 경우
      prev_line_content=prev_line_content+list_itemInfo[i].content//.replace(/ /g, "_")
    }
    prev_level = list_itemInfo[i].level
  }
  list_line_content.push(prev_line_content)
  // list_line_content.push(html_mode?"</pre>":"```")

  let text = list_line_content.join("\n")
  return text
}

/** 리스트 데이터를 mermaid 마인드맵으로 변환 */
async function data2mindmap(
  list_itemInfo: List_ListItem, 
  div: HTMLDivElement
){
  // const subEl = document.createElement("div"); div.appendChild(subEl);
  //   subEl.textContent = "Disable, please replace `markmap` command"; subEl.setAttribute("style", "border: solid 2px red; padding: 10px;");
  // return div

  let list_newcontent:string[] = []
  for (let item of list_itemInfo){
    // 레벨을 들여쓰기로 변환하고, "\n"을 <br/>로 변환
    let str_indent = ""
    for(let i=0; i<item.level; i++) str_indent+= " "
    list_newcontent.push(str_indent+item.content.replace("\n","<br/>"))
  }
  const mermaidText = "mindmap\n"+list_newcontent.join("\n")
  return render_mermaidText(mermaidText, div)
}

// mermaid 블록의 내용을 통해 mermaid 블록을 렌더링
async function render_mermaidText(mermaidText: string, div: HTMLElement) {
  // 1. 네 가지 중 하나. 직접 렌더링
  // full-ob 사용
  // - 장점: 가장 빠름, 이중 변환 불필요
  // - 단점: abc 모듈에 mermaid를 내장해야 함, 구버전 플러그인은 당시의 obsidian 내장 mermaid 버전이 너무 오래되어 사용
  // - 선택: 현재 ob 환경에서 사용하기에 가장 좋음. vuepress-mdit에서는 다른 버그가 있음, DOMPurify 손실: https://github.com/mermaid-js/mermaid/issues/5204
  // - 보충: 폐기된 함수: mermaid.mermaidAPI.renderAsync("ab-mermaid-"+getID(), mermaidText, (svgCode:string)=>{ div.innerHTML = svgCode })
  const { svg } = await mermaid.render("ab-mermaid-"+getID(), mermaidText)
  div.innerHTML = svg

  // 2. 네 가지 중 하나. 여기서 환경에 맞게 렌더링
  // - 장점: abc 모듈에 mermaid를 반복 내장할 필요 없음
  // - 단점: ob에서는 하나의 mermaid 블록 변경이 페이지 내 모든 mermaid를 함께 변경, mdit에서는 id에 문제가 있는 듯
  // min-ob 사용
  // ABConvertManager.getInstance().m_renderMarkdownFn("```mermaid\n"+mermaidText+"\n```", div)

  // 3. 네 가지 중 하나. 여기서 렌더링하지 않고 상위 레이어에 맡김
  // 현재 mdit 선택
  // - 장점: abc 모듈에 mermaid를 반복 내장할 필요 없음. mdit에서는 출력 형식이 반드시 html일 필요가 없음
  // - 단점: ab의 인터페이스 설계와 충돌, 임시로 사용, 후에 규범화 필요. 다른 한편으로는 이 방법이 메모리 폭발을 일으키는 이유를 모름 (markmap도 이렇게 사용해도 문제 없음, mermaid만 문제)
  // - 선택: mdit에서 사용 가능, dev 환경의 최적 전략
  // div.classList.add("ab-raw")
  // div.innerHTML = `<div class="ab-raw-data" type-data="mermaid" content-data='${mermaidText}'></div>`

  // 4. 네 가지 중 하나. 순수 동적/수동 렌더링
  // - 장점: abc 모듈에 mermaid를 반복 내장할 필요 없음
  // - 단점: ab 변환이 아닌 mermaid 블록은 스스로 관리하지 않음, 변환에 지연이 있을 수 있으며 수동으로 트리거해야 함
  // - 선택: 모두 사용 가능, 효과는 좋지 않지만 메모리를 절약. 방법 3은 이유를 모르겠지만 메모리 폭발을 일으킴
  // const div_btn = document.createElement("button"); div.appendChild(div_btn); div_btn.textContent = "ChickMe ReRender Mermaid";
  // div_btn.setAttribute("style", "background-color: argb(255, 125, 125, 0.5)");
  // div_btn.setAttribute("onclick", `
  // console.log("mermaid chick");
  // let script_el = document.querySelector('script[script-id="ab-mermaid-script"]');
  // if (script_el) script_el.remove();
  // script_el = document.createElement('script'); document.head.appendChild(script_el);
  // script_el.type = "module";
  // script_el.setAttribute("script-id", "ab-mermaid-script");
  // script_el.textContent = \`
  // import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  // mermaid.initialize({ startOnLoad: false });
  // const el_mermaids = document.querySelectorAll('.ab-mermaid-raw');
  // function getID(length=16){
  //   return Number(Math.random().toString().substr(3,length) + Date.now()).toString(36);
  // }
  // for(const el_mermaid of el_mermaids) {
  //   const { svg } = await mermaid.render("ab-mermaid-"+getID(), el_mermaid.textContent);
  //   el_mermaid.innerHTML = svg
  // }
  // \``);
  // const pre_div = document.createElement("pre"); div.appendChild(pre_div); pre_div.classList.add("ab-mermaid-raw"); pre_div.textContent = mermaidText;
  
  return div
}
