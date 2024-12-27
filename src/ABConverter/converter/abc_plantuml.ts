/**
 * 변환기_디렉토리 트리
 * 
 * md_str <-> md_str
 * md_str <-> html
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {ListProcess, type List_ListItem} from "./abc_list"

import plantumlEncoder from "plantuml-encoder"

const abc_list2jsontext = ABConvert.factory({
  id: "json2pumlJson",
  name: "json에서 시각화로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    content = "@startjson\n" + content + "\n@endjson\n"
    render_pumlText(content, el)
    return el
  }
})

const abc_list2pumlWBS = ABConvert.factory({
  id: "list2pumlWBS",
  name: "목록에서 puml 작업 분해 구조로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let listdata:List_ListItem = ListProcess.list2data(content)
    listdata = ListProcess.data2strict(listdata)
    let newContent = "@startwbs\n"
    for (let item of listdata) {
      if (item.content.startsWith("< "))
        newContent += "*".repeat(item.level+1) + "< " + item.content.slice(2,) + "\n"
      else
        newContent += "*".repeat(item.level+1) + " " + item.content + "\n"
    }
    newContent += "@endwbs"

    render_pumlText(newContent, el)
    return el
  }
})

const abc_list2pumlMindmap = ABConvert.factory({
  id: "list2pumlMindmap",
  name: "목록에서 puml 마인드맵으로",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.el,
  process: (el, header, content: string): HTMLElement=>{
    let listdata:List_ListItem = ListProcess.list2data(content)
    listdata = ListProcess.data2strict(listdata)
    let newContent = "@startmindmap\n"
    for (let item of listdata) {
      newContent += "*".repeat(item.level+1) + " " + item.content + "\n"
    }
    newContent += "@endmindmap"

    render_pumlText(newContent, el)
    return el
  }
})

async function render_pumlText(text: string, div: HTMLElement) {
    // 1. 네 가지 중 하나 선택. 직접 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조)
    // 현재 mdit와 ob 사용
    var encoded = plantumlEncoder.encode(text)
    let url = 'http://www.plantuml.com/plantuml/img/' + encoded
    div.innerHTML = `<img src="${url}">`

    // 2. 네 가지 중 하나 선택. 여기서 환경 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조)
    //ABConvertManager.getInstance().m_renderMarkdownFn("```plantuml\n"+text+"```", div)

    // 3. 네 가지 중 하나 선택. 여기서 렌더링하지 않고 상위 레이어에 맡김 (장단점은 abc_mermaid의 유사한 방법 참조)
    //div.classList.add("ab-raw")
    //div.innerHTML = `<div class="ab-raw-data" type-data="plantuml" content-data='${text}'></div>`

    // 4. 네 가지 중 하나 선택. 순수 동적/수동 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조)
    // ...

    return div
}
