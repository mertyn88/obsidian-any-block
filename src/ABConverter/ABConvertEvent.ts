/**
 * 일부 AB 블록의 후속 이벤트
 * 
 * @detail
 * 일반적인 AB 블록 Dom 구조는 생성 후 더 이상 변경할 필요가 없지만, 일부 AB 블록은 완전히 렌더링된 후 추가 작업이 필요합니다.
 * 
 * 이러한 작업은 이곳에 통합하여 등록됩니다.
 */

import { MarkdownEditView } from "obsidian";

/**
 * 일부 AB 블록의 후속 이벤트 - css 로드 완료 후 트리거
 * 
 * @param d 여기에는 두 가지 가능성이 있습니다:
 *   - 하나는 부분 새로 고침으로, d는 부분 div입니다. 이 경우 d는 `.ab-replace`이어야 하며, 사전 설정된 구조를 충족해야 합니다.
 *   - 두 번째는 전체 새로 고침으로, 페이지 로드 완료 후 자동으로 한 번 호출되며, d는 문서입니다.
 */
export function abConvertEvent(d: Element|Document) {
  // 초광폭 div 이벤트 (오직 obsidian), 이 이벤트는 우선 처리되어야 합니다.
  if (d.querySelector('.ab-super-width')) {
    // 부분 (오직 obsidian)
    const els_note: NodeListOf<Element> = d.querySelectorAll(".ab-note");
    for (const el_note of els_note) {
      if (el_note.querySelector(".ab-super-width")) {
        const el_replace: ParentNode | null | undefined = el_note.parentNode;
        if (el_replace && (el_replace as HTMLElement).classList.contains("ab-replace")) {
          (el_replace as HTMLElement).classList.add("ab-super-width-p");
        }
      }
    }
    // 전체 (오직 obsidian), 여기서는 document가 아닌 d에서 찾습니다.
    const els_view: NodeListOf<Element> = document.querySelectorAll(".app-container .workspace-leaf"); // 다중 창 지원
    for (const el_view of els_view) {
      (el_view as HTMLElement).style.setProperty('--ab-width-outer', ((el_view as HTMLElement).offsetWidth - 40).toString() + "px"); // 40/2는 여백 (스크롤바보다 커야 함)
    }
  }

  // list2nodes, 원호 조정 이벤트
  if (d.querySelector('.ab-nodes-node')) {
    const els_min = document.querySelectorAll(".ab-nodes.min .ab-nodes-node");
    const list_children = d.querySelectorAll(".ab-nodes-node")
    for (let children of list_children) {
      // 요소 준비
      const el_content = children.querySelector(".ab-nodes-content") as HTMLElement; if (!el_content) continue
      const el_child = children.querySelector(".ab-nodes-children") as HTMLElement; if (!el_child) continue
      const el_bracket = el_child.querySelector(".ab-nodes-bracket") as HTMLElement; if (!el_bracket) continue
      const el_bracket2 = el_child.querySelector(".ab-nodes-bracket2") as HTMLElement; if (!el_bracket2) continue
      const els_child = el_child.childNodes;
      if (els_child.length < 3) {
        el_bracket.style.setProperty("display", "none")
        el_bracket2.style.setProperty("display", "none")
        continue
      }
      const el_child_first = els_child[2] as HTMLElement;
      const el_child_last = els_child[els_child.length - 1] as HTMLElement;
      const el_child_first_content = el_child_first.querySelector(".ab-nodes-content") as HTMLElement
      const el_child_last_content = el_child_last.querySelector(".ab-nodes-content") as HTMLElement

      // 매개변수 준비
      // 두 가지 경우가 있습니다. height가 0이 아닌 경우 높이는 (height)와 같고 (일반적으로 1-1 구조가 이 경우에 해당), 그렇지 않으면 높이는 (100%-heightToReduce)와 같습니다.
      let height = 0;
      let heightToReduce = (el_child_first.offsetHeight + el_child_last.offsetHeight) / 2;

      // 가상 클래스 수정
      if (els_child.length == 3) { // 구조: 1-1
        height = (el_child_first_content.offsetHeight-20) > 20 ? (el_child_first_content.offsetHeight-20) : 20
        el_bracket2.style.cssText = `
          height: ${height}px;
          top: calc(50% - ${height/2}px);
        `
      } else { // 구조: 1-n
        el_bracket2.style.cssText = `
          height: calc(100% - ${heightToReduce}px);
          top: ${el_child_first.offsetHeight/2}px;
        `
      }

      // 가상 클래스 수정 - min 스타일 버전 (주의: cssText를 사용하여 덮어쓰면서 스타일을 누락하지 마세요)
      if (Array.prototype.includes.call(els_min, children)) {
        if (els_child.length == 3) { // 구조: 1-1, 원점 있음
          el_bracket.style.cssText = `
            display: block;
            top: calc(50% + ${el_content.offsetHeight/2}px - 3px);
            clip-path: circle(40% at 50% 40%);
          `
        } else { // 구조: 1-n, 원점 없음, 연장선
          el_bracket.setAttribute("display", "none")
          // el_bracket.style.cssText = `
          //   display: block;
          //   height: 1px;
          //   top: calc(50% + ${el_content.offsetHeight/2}px - 1px);
          //   width: 18px; /* 약간 넘칠 수 있음 */
          //   left: -20px;
          //   border-bottom: 1px solid var(--node-color);
          //   clip-path: none;
          // `
        }

        if (els_child.length == 3 && el_content.offsetHeight == el_child_first_content.offsetHeight) { // 구조: 1-1 및 높이가 동일한 경우, 괄호 대신 가로선을 사용
          el_bracket2.style.cssText = `
            height: 1px;
            top: calc(50% + ${el_content.offsetHeight/2}px - 1px);
            width: 18px; /* 약간 넘칠 수 있음 */
            border-radius: 0;
            border: none;
            border-bottom: 1px solid var(--node-color);
          `
        }
        else { // 그렇지 않으면 기존 기초에 미세 조정
          // el_bracket2.style.setProperty("border-radius", "2px 0 0 2px")
          // if (height==0) {
          //   el_bracket2.style.setProperty("height", `calc(100% - ${heightToReduce}px + 12px)`); // 기존 기초+12 (el_child_last_content의 반 높이를 더해야 함)
          // } else {
          //   el_bracket2.style.setProperty("height", `${height+10}px`); // 기존 기초+10
          // }
          if (els_child.length == 3) {
            height = el_child_last_content.offsetHeight/2 - el_content.offsetHeight/2;
            el_bracket2.style.setProperty("height", `${height}px`);
            el_bracket2.style.setProperty("top", `calc(50% + ${el_content.offsetHeight/2}px)`);
            el_bracket2.style.setProperty("border-radius", `0 0 0 10px`);
            el_bracket2.style.setProperty("border-top", `0`);
          } else {
            heightToReduce = el_child_first.offsetHeight/2 + el_child_first_content.offsetHeight/2 + el_child_last.offsetHeight/2 - el_child_last_content.offsetHeight/2;
            el_bracket2.style.setProperty("height", `calc(100% - ${heightToReduce}px + 1px)`);
            el_bracket2.style.setProperty("top", `${el_child_first.offsetHeight/2 + el_child_first_content.offsetHeight/2 - 1}px`);
          }
          el_bracket2.style.setProperty("width", "20px");
        }

        // 아래 내용은 사용하지 않습니다. 문제 존재: canvas의 아이디어는 잘못된 것 같고, mehrmaid를 참고하여 svg를 사용해야 하며, div를 감쌀 수 있습니다.
        /*else {
          el_bracket2.style.setProperty("height", `100%`);
          el_bracket2.style.setProperty("top", `0`);
          el_bracket2.style.setProperty("width", `38px`); // 약간 넘칠 수 있음
          el_bracket2.style.setProperty("left", `-20px`);
          el_bracket.style.setProperty("display", "none");

          const el_canvas: HTMLCanvasElement = document.createElement("canvas"); el_bracket2.appendChild(el_canvas);
            el_canvas.style.setProperty("width", "100%")
            el_canvas.style.setProperty("height", "100%")
          const rect_canvas = el_canvas.getBoundingClientRect()
          const rect_bracket = el_bracket2.getBoundingClientRect()
          const point_bracket = {
            x: rect_bracket.right - rect_canvas.left,
            y: rect_bracket.bottom - rect_canvas.top
          };
          for (let childNode of childNodes) { // TODO 앞의 두 개를 건너뛰어야 합니다. 앞의 두 개는 괄호입니다.
            const rect_childNode = (childNode as HTMLElement).getBoundingClientRect()
            const point_childNode = {
              x: rect_childNode.right - rect_canvas.left,
              y: rect_childNode.bottom - rect_canvas.top
            }
            // 연결선
            const ctx = el_canvas.getContext('2d');
            if (!ctx) continue;
            console.log(".ab-nodes.min canvas ctx 획득 성공", rect_canvas, rect_bracket, rect_childNode) // canvas와 bracket은 실제로 겹쳐져 있습니다...
            // ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 지우기
            ctx.beginPath(); // 연결선 그리기 시작
            ctx.moveTo(point_bracket.x - point_bracket.x, point_bracket.y - point_bracket.x);
            ctx.lineTo(point_childNode.x - point_bracket.x, point_childNode.y - point_bracket.x);
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }*/
      }
    }
  }

  // list2card, 폭포 흐름 카드 순서 재조정 이벤트
  if (d.querySelector('.ab-items.ab-card:not(.js-waterfall)')) {
    const root_el_list = d.querySelectorAll(".ab-items.ab-card:not(.js-waterfall)")
    for (let root_el of root_el_list) {
      // 1. 원래 요소 준비
      root_el.classList.add("js-waterfall") // 방지: 두 번 트리거될 때, 두 번째 트리거는 첫 번째 트리거의 순서를 기준으로 다시 조정됩니다.
      const list_children = root_el.querySelectorAll(".ab-items-item")
      // 열 수와 열 너비 계산
      const columnCountTmp = parseInt(window.getComputedStyle(root_el).getPropertyValue('column-count'))
      let columnCount: number;
      if (columnCountTmp && !isNaN(columnCountTmp) && columnCountTmp>0) {
        columnCount = columnCountTmp;
      } else if (root_el.classList.contains("ab-col-auto") && list_children.length<=4) {
        columnCount = list_children.length;
        root_el.classList.add("ab-col"+columnCount)
      }
      else {
        columnCount = 4;
        root_el.classList.add("ab-col"+columnCount)
      }
      // const columnWidth = root_el.clientWidth / columnCount;

      // 2. 높이 캐시, 요소 캐시 준비
      let height_cache:number[] = []; // 각 열의 현재 높이를 캐시하여, 새 요소를 가장 낮은 열에 추가합니다.
      let el_cache:HTMLElement[][] = [];
      for (let i = 0; i < columnCount; i++) {
        height_cache.push(0);
        el_cache.push([])
      }

      // 3. 순서 배열 얻기
      for (let children of list_children) {
        const minValue: number =  Math.min.apply(null, height_cache);
        const minIndex: number =  height_cache.indexOf(minValue)
        const heightTmp = parseInt(window.getComputedStyle(children).getPropertyValue("height"))
        height_cache[minIndex] += (heightTmp && !isNaN(heightTmp) && heightTmp>0) ? heightTmp : 10;
        el_cache[minIndex].push(children as HTMLElement)
      }

      // 3.2. 특수 상황에서의 예외 수정:
      //    특수 상황은 N열로 나눌 때, (length%N != 0 || length%N != N-1)인 경우 문제가 발생합니다.
      //    또는 이렇게 쓰면 이해하기 쉬울 수 있습니다: (length%(N-1) != N || length%(N-1) != N-1)인 경우, 마지막 열이 여러 개 부족할 때 문제가 발생합니다.
      const fillNumber = columnCount-list_children.length%columnCount
      if (fillNumber!=4) {
        for (let i=0; i<fillNumber; i++) {
          const children = document.createElement("div"); children.classList.add(".ab-items-item.placeholder"); children.setAttribute("style", "height: 20px")
          const minValue: number =  Math.min.apply(null, height_cache);
          const minIndex: number =  height_cache.indexOf(minValue)
          height_cache[minIndex] += 20
          el_cache[minIndex].push(children as HTMLElement)
        }
      }

      // 4. 순서대로 요소 다시 채우기
      root_el.innerHTML = ""
      for (let i=0; i<columnCount; i++) {
        for (let j of el_cache[i]) {
          root_el.appendChild(j)
        }
      }
    }
  }

  // xxx2markmap, 높이 재조정 이벤트
  if (d.querySelector('.ab-markmap-div')) {
    const divEl = d as Element;
    let markmapId = '';
    if (divEl.tagName === 'DIV') {
      markmapId = divEl.querySelector('.ab-markmap-div')?.id || '';
    }
    let mindmaps: NodeListOf<HTMLElement>;
    if (markmapId) {
      mindmaps = document.querySelectorAll('#' + markmapId);
    } else {
      mindmaps = document.querySelectorAll('.ab-markmap-div'); // 여기 선택자에 주의하세요.
    }

    for(const el_div of mindmaps) {
      const el_svg: SVGGraphicsElement|null = el_div.querySelector("svg")
      const el_g: SVGGraphicsElement|null|undefined = el_svg?.querySelector("g")
      if (el_svg && el_g) {
        // 확대 배율 얻기
        // const transformValue = el_g.getAttribute('transform');
        // if (transformValue && transformValue.indexOf('scale') > -1) {
        //   const scaleMatch = transformValue.match(/scale\(([^)]+)\)/);
        //   if (scaleMatch) {
        //     const scale_old = parseFloat(scaleMatch[1]);
        //     ...
        //   }
        // }
        const scale_new = el_g.getBBox().height/el_div.offsetWidth;
        el_svg.setAttribute("style", `height:${el_g.getBBox().height*scale_new+40}px`); // 컨테이너 크기 재조정
        // el_g.setAttribute("transform", `translate(20.0,80.0) scale(${scale_new})`) // 위치 및 확대 재조정
        markmap_event(d) // 위치 조정에 문제가 있는 것 같아, 다시 렌더링해야 합니다...
      }
    }
  }
}

/**
 * 일부 AB 블록의 후속 이벤트 - dom 로드 완료 후 트리거 - markmap
 */
export function markmap_event(d: Element|Document) {
  // xxx2markmap, 렌더링 이벤트
  if (d.querySelector('.ab-markmap-svg')) {
    console.log("  - markmap_event")
    let script_el: HTMLScriptElement|null = document.querySelector('script[script-id="ab-markmap-script"]');
    if (script_el) script_el.remove();
    const divEl = d as Element;
    let markmapId = '';
    if (divEl.tagName === 'DIV') {
      markmapId = divEl.querySelector('.ab-markmap-svg')?.id || '';
    }
    script_el = document.createElement('script'); document.head.appendChild(script_el);
    script_el.type = "module";
    script_el.setAttribute("script-id", "ab-markmap-script");
    script_el.textContent = `
    import { Markmap, } from 'https://jspm.dev/markmap-view';
    const markmapId = "${markmapId || ''}";
    let mindmaps;
    if (markmapId) {
      mindmaps = document.querySelectorAll('#' + markmapId);
    } else {
      mindmaps = document.querySelectorAll('.ab-markmap-svg'); // 여기 선택자에 주의하세요.
    }
    for(const mindmap of mindmaps) {
      mindmap.innerHTML = "";
      Markmap.create(mindmap,null,JSON.parse(mindmap.getAttribute('data-json')));
    }`;
  }
}
