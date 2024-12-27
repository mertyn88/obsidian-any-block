/**
 * AB 변환기 - markmap 관련
 * 
 * (선택 사항) 참고: Ob 플러그인에 1.3MB 추가
 * 
 * 사용 주의 사항: 이 파일에서 `markmap渲染`을 검색한 후, 해당 주석에 따라 주 코드에 일부 코드를 추가하세요.
 * 
 * 모듈화 난점, 이 플러그인은 모듈화가 매우 어렵습니다.
 * 1. 내용이 전체적으로 나타나지 않고 부분적으로 나타나며, 부분 렌더링 문제
 *     markmap은 하나의 markdown 파일을 하나의 mindmap으로 렌더링하는 유형으로, 내가 원하는 부분 렌더링과 다릅니다.
 *     API를 호출하여 얻은 html_str은 `<html>`, `<script>`를 포함하고 있어 부분 div에 적용할 수 없습니다.
 *     그래서 부분 렌더링 mindmap을 참고할 수 있는 것을 찾고 싶었습니다:
 *     https://github.com/aleen42/gitbook-mindmaps/blob/master/src/mindmaps.js
 *     https://github.com/deiv/markdown-it-markmap/blob/master/src/index.js
 *		 https://github.com/NeroBlackstone/markdown-it-mindmap/blob/main/index.js
 * 2. 렌더링 시간을 각 mindmap 블록이 한 번씩 처리하면 중복 렌더링 및 느린 문제가 발생합니다. 여기서는 수동 렌더링 버튼을 제공하지만 자동 렌더링을 원할 경우:
 *    - Ob 환경에서는 문서 렌더링이 완료될 때 `Markmap.create`를 호출하는 후크가 필요합니다.
 *    - VuePress-Mdit 환경에서는 실제 document 요소가 없으며, 파일을 여는 후크가 mdit 내에 없으므로 vuepress 플러그인이 필요할 수 있습니다.
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {ABReg} from "../ABReg"
import { abConvertEvent, markmap_event } from "../ABConvertEvent";

/**
 * 랜덤 id 생성
 * 
 * @detail mermaid 렌더링 블록에 id가 필요하기 때문에, 그렇지 않으면 여러 mermaid 블록이 충돌할 수 있습니다.
 */
function getID(length=16){
	return Number(Math.random().toString().substr(3,length) + Date.now()).toString(36);
}

// markmap 관련
import { Transformer, builtInPlugins } from 'markmap-lib'
import type { C2ListItem } from "./abc_c2list";
import { abc_title2listdata } from "./abc_list";
const transformer = new Transformer();
//import { Markmap, loadCSS, loadJS } from 'markmap-view'

const abc_list2mindmap = ABConvert.factory({
id: "list2markmap",
name: "리스트에서 마인드맵으로 (markmap)",
process_param: ABConvert_IOEnum.text,
process_return: ABConvert_IOEnum.el,
process: (el, header, content: string): HTMLElement=>{
		list2markmap(content, el)
		markmap_event(el)
		// setTimeout(()=>{abConvertEvent(el)}, 500);
		return el
	}
})

function list2markmap(markdown: string, div: HTMLDivElement) {
	// 1. markdown 파싱 (markmap-lib)
	const { root, features } = transformer.transform(markdown.trim()); // 1. transform Markdown
	const assets = transformer.getUsedAssets(features); // 2. get assets (option1)

	// 2. 렌더링
	{
		// 1. 네 가지 중 하나 선택. 직접 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조)
		// npm mindmap-view 방법
		// // if (assets.styles) loadCSS(assets.styles);
		// // if (assets.scripts) loadJS(assets.scripts, { getMarkmap: () => {} });
		// const mindmaps = document.querySelectorAll('.ab-markmap-svg'); // 여기 선택자 주의
		// for(const mindmap of mindmaps) {
		//  mindmap.innerHTML = "";
		// 	const datajson: string|null = mindmap.getAttribute('data-json')
		// 	if (datajson === null) { console.error("ab-markmap-svg without data-json") }
		// 	g_markmap = Markmap.create(mindmap as SVGElement, undefined, JSON.parse(datajson as string));
		// };

		// 2. 네 가지 중 하나 선택. 환경에 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조)
		// ...

		// 3. 네 가지 중 하나 선택. 렌더링하지 않고 상위 레이어에 맡김 (장단점은 abc_mermaid의 유사한 방법 참조)
		// 현재 mdit 사용
		// div.classList.add("ab-raw")
		// div.innerHTML = `<div class="ab-raw-data" type-data="markmap" content-data='${markdown}'></div>`

		// 4. 네 가지 중 하나 선택. 순수 동적/수동 렌더링 (장단점은 abc_mermaid의 유사한 방법 참조).
		// 4.1. 구 Ob 사용
		// const svg_btn = document.createElement("button"); div.appendChild(svg_btn); svg_btn.textContent = "ChickMe ReRender Markmap";
		// svg_btn.setAttribute("style", "background-color: argb(255, 125, 125, 0.5)");
		// svg_btn.setAttribute("onclick", `
		// console.log("markmap chick");
		// let script_el = document.querySelector('script[script-id="ab-markmap-script"]');
		// if (script_el) script_el.remove();
		// script_el = document.createElement('script'); document.head.appendChild(script_el);
		// script_el.type = "module";
		// script_el.setAttribute("script-id", "ab-markmap-script");
		// script_el.textContent = \`
		// import { Markmap, } from 'https://jspm.dev/markmap-view';
		// const mindmaps = document.querySelectorAll('.ab-markmap-svg');
		// for(const mindmap of mindmaps) {
		//  mindmap.innerHTML = "";
		// 	Markmap.create(mindmap,null,JSON.parse(mindmap.getAttribute('data-json')));
		// }\``);
    // 4.2. 신 Ob 사용, 현재 Ob의 새로고침 버튼은 외부에 통합되어 있습니다.
    let height_adapt = 30 + markdown.split("\n").length*15; // 1. 대략적인 px 추정: 30 + (0~50)행 * 15 = [30~780]. 2. 정확한 추정을 위해서는 직접 한 번 파싱해야 하며, 번거롭습니다. 3. 이후 이벤트로 이 대략적인 높이가 덮어씌워지므로 중요하지 않습니다. 4. 또한 "작게" 전략을 채택하여 시각적으로 더 나은 효과를 줍니다.
    if (height_adapt>1000) height_adapt = 1000;
    const id = Math.random().toString(36).substring(2);
		const svg_div = document.createElement("div"); div.appendChild(svg_div); svg_div.classList.add("ab-markmap-div"); svg_div.id = "ab-markmap-div-"+id
		const html_str = `<svg class="ab-markmap-svg" id="ab-markmap-${id}" data-json='${JSON.stringify(root)}' style="height:${height_adapt}px"></svg>` // TODO 이곳이 `'` 기호의 이상을 초래하는 것 같습니다.
		svg_div.innerHTML = html_str
	}

	return div
}
