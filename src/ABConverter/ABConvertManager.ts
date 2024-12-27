/** 
 * @detail
 * 구체적인 사용법과 소개 등은 README.md를 참조하세요.
 * 
 * 의존 순서
 * 1. ABConvert.ts, 변환기의 추상 기반 클래스
 * 2. ABConvertManager.ts, 변환기의 컨테이너
 * 3. ……, 기타 구체적인 변환기
 * 
 * 크로스 플랫폼 호환성 문제
 * - Obsidian 환경에서는 document를 사용할 수 있습니다.
 * - vuepress와 mdit 환경에서는 순수 텍스트로 md를 파싱하고 렌더링하며 객체 지향적이지 않으며 document에 의존하지 않습니다. 따라서 이를 고려하여 Node.js에서 사용할 수 있는 [jsdom](https://github.com/jsdom/jsdom)을 추가로 설치해야 합니다.
 * 
 * jsdom 설치 실패. 인터넷 검색 결과:
 * a: jsdom은 contextify에 의존하며, contextify는 최근에야 Windows를 지원합니다. 설치하려면 Python과 C++ 컴파일러가 필요합니다.
 * b: jsdom은 contextify를 사용하여 DOM에서 JavaScript를 실행합니다. contextify는 로컬 C++ 컴파일러가 필요합니다. 공식 설명에 따르면 Windows 플랫폼에서는 많은 것을 설치해야 합니다.
 * 하지만 나중에 한 답변에서 버전을 지정하니 설치가 가능했습니다: npm install -D jsdom@4.2.0
 */

// AB 변환기 컨테이너
import {
  ABConvert_IOEnum, 
  type ABConvert_IOType, 
  ABConvert
} from './converter/ABConvert'
import { autoABAlias } from "./ABAlias"
import { ABCSetting } from "./ABReg"
 
/**
  * AB 변환기의 관리자. 주의: 사용 전에 반드시 `redefine_renderMarkdown`을 실행해야 합니다.
  * 
  * @default
  * 싱글톤 패턴 
  * 변환기의 등록, 검색, 순차적 사용을 담당합니다.
  */
export class ABConvertManager {

  /** --------------------------------- 특수 함수 ---------------------------- */

  /// 싱글톤 패턴
  static getInstance(): ABConvertManager {
    if (!ABConvertManager.m_instance) {
      ABConvertManager.m_instance = new ABConvertManager()
    }
    return ABConvertManager.m_instance;
  }

  /// 싱글톤
  private static m_instance: ABConvertManager

  /// 생성자
  private constructor() {
    /// 환경 출력 (컴파일 시 출력)
    // @ts-ignore obsidian이 존재하는지 확인하기 위해 사용, 존재하지 않으면 정상적으로 빨간 줄이 그어집니다.
    if (typeof obsidian == 'undefined' && typeof app == 'undefined') {
      // @ts-ignore
      console.log('[environment]: markdown-it, without obsidian')
    } else {
      console.log('[environment]: obsidian')
    }
  }

  /** --------------------------------- 프로세서 컨테이너 관리 --------------------- */

  /// ab 프로세서 - 엄격한 버전의 인터페이스 및 목록 (동적)
  public list_abConvert: ABConvert[] = []

  /// 프로세서 목록 - 드롭다운 추천
  public getConvertOptions(){
    return this.list_abConvert
    .filter(item=>{
      return item.default
    })
    .map(item=>{
      return {id:item.default, name:item.name}
    })
  }

  /** --------------------------------- 일반적인 디커플링 어댑터 (동적) ----------------- */

  /**
   * 텍스트를 html로 렌더링
   * @detail 여기서는 콜백 함수로 대체될 수 있어야 합니다. 소프트웨어 자체의 html 렌더링 메커니즘에 연결하여 디커플링을 수행합니다.
   * @param markdown 원본 md
   * @param el 추가할 요소
   * @param ctx Obsidian에서는 여기서 MarkdownRenderChild 타입을 전달해야 하지만, 크로스 플랫폼을 위해 여기서는 선택적인 any 타입으로 수정했습니다.
   */
  public m_renderMarkdownFn:(markdown: string, el: HTMLElement, ctx?: any) => void = (markdown, el) => {
    el.classList.add("markdown-rendered") // 이 함수를 사용하기 전에 el에 이 css 클래스를 추가하거나 재정의할 때 이 문장을 추가해야 합니다.
    console.error("AnyBlockError: md 렌더러를 먼저 지정/재정의하세요.")
  }

  /// 콜백 함수로 재렌더러 대체
  public redefine_renderMarkdown(callback: (markdown: string, el: HTMLElement, ctx?: any) => void) {
    this.m_renderMarkdownFn = callback
  }

  /** --------------------------------- 프로세서 호출 ----------------------- */
  
  static startTime: number; // cache
  /**
   * 자동으로 일치하는 ab 프로세서를 찾아 처리합니다.
   * 
   * @detail
   *     ab 변환기는 header와 content를 기반으로 텍스트 블록을 html 요소로 변환할 수 있습니다.
   *     주로 세 가지 과정으로 나뉩니다:
   *     1. 전처리
   *     2. 재귀 처리
   *     3. 후처리 (사실 후처리도 전처리에 포함될 수 있습니다.)
   * @param el 최종 렌더링 결과
   * @param header 변환 방식
   * @param content 변환할 초기 텍스트 (접두사 없는 버전, 선택기 단계에서 접두사가 이미 삭제되었습니다.)
   * @param selectorName 선택기 이름, 비어 있으면 미지정
   * @return el과 동일, 무용지물, 나중에 삭제할 수 있습니다.
   */
  public static autoABConvert(el:HTMLDivElement, header:string, content:string, selectorName:string = ""): void{
    let prev_result: ABConvert_IOType = content               // 이전 변환 결과, 초기에는 반드시 string
    let prev_type: string = "string"                          // 이전 변환 결과의 타입 (타입 검사에 의해)
    let prev_type2: ABConvert_IOEnum = ABConvert_IOEnum.text  // 이전 변환 결과의 타입 (인터페이스 선언에 의해)
    let prev_processor;                                       // 이전 변환 프로세서
    let prev = {                                              // 참조 전달을 위해 함께 결합
      prev_result, prev_type, prev_type2, prev_processor
    }

    if (false && ABCSetting.is_debug) ABConvertManager.startTime = performance.now();
    {
      header = autoABAlias(header, selectorName, prev_result as string);
      let list_header = header.split("|")
      prev_result = this.autoABConvert_runConvert(el, list_header, prev)
      this.autoABConvert_last(el, header, selectorName, prev)
    }
    if (false && ABCSetting.is_debug) {
      const endTime = performance.now();
      console.log(`Takes ${(endTime - ABConvertManager.startTime).toFixed(2)} ms when selector "${selectorName}" header "${header}"`);
    }
  }

  /**
   * autoABConvert의 재귀 하위 함수
   * @param el 
   * @param list_header 
   * @param prev_result 이전 변환 결과
   * @param prev_type   이전 변환 결과의 타입 (타입 검사에 의해, typeof 타입)
   * @param prev_type2  이전 변환 결과의 타입 (인터페이스 선언에 의해, IOEnum 타입)
   * @returns           재귀 변환 결과
   */
  private static autoABConvert_runConvert(el:HTMLDivElement, list_header:string[], prev:any):any{
    // header 그룹을 순환하여 텍스트 프로세서가 모두 처리되거나 렌더링 프로세서가 발견될 때까지 반복
    for (let item_header of list_header){ // TODO 중간 자동 변환기가 삽입될 수 있으므로, for를 재귀로 대체하거나 모두 헤더 전처리 시 완료해야 합니다.
      for (let abReplaceProcessor of ABConvertManager.getInstance().list_abConvert){
        // header를 통해 프로세서 찾기
        if (typeof(abReplaceProcessor.match)=='string'){if (abReplaceProcessor.match!=item_header) continue}
        else {if (!abReplaceProcessor.match.test(item_header)) continue}
        // TODO 이전 별명 시스템 삭제
        // 별명이 있는지 확인. 있다면 재귀
        if(abReplaceProcessor.process_alias){
          // 별명은 정규 표현식 매개변수를 참조할 수 있습니다.
          let alias = abReplaceProcessor.process_alias
          ;(()=>{
            if (abReplaceProcessor.process_alias.indexOf("%")<0) return
            if (typeof(abReplaceProcessor.match)=="string") return
            const matchs = item_header.match(abReplaceProcessor.match)
            if (!matchs) return
            const len = matchs.length
            if (len==1) return
            // replaceAlias
            for (let i=1; i<len; i++){
              if (!matchs[i]) continue
              alias = alias.replace(RegExp(`%${i}`), matchs[i]) /** @bug 원래는 `(?<!\\)%${i}`를 사용해야 하지만, ob는 정규 표현식의 전방 탐색을 지원하지 않습니다. */
            }
          })()
          prev.prev_result = this.autoABConvert_runConvert(el, alias.split("|"), prev)
        }
        // 그렇지 않으면 process 메서드 사용
        else if(abReplaceProcessor.process){
          // (1) 입력 타입 확인
          if (abReplaceProcessor.process_param != prev.prev_type2){
            // TODO, 두 개의 자동 프로세서, 나중에 별명 시스템으로 대체되어야 합니다.
            if (abReplaceProcessor.process_param==ABConvert_IOEnum.el &&
              prev.prev_type2==ABConvert_IOEnum.text
            ){ // html 입력이 필요하고 실제로는 md가 입력된 경우, md->html을 삽입합니다.
              const subEl: HTMLDivElement = document.createElement("div"); el.appendChild(subEl);
              ABConvertManager.getInstance().m_renderMarkdownFn(prev.prev_result, subEl);
              prev.prev_result = el
              prev.prev_type = typeof(prev.prev_result)
              prev.prev_type2 = ABConvert_IOEnum.el
              prev.prev_processor = "md"
            }
            else if (abReplaceProcessor.process_param==ABConvert_IOEnum.text &&
              (prev.prev_type2==ABConvert_IOEnum.list_strem || prev.prev_type2==ABConvert_IOEnum.c2list_strem)
            ) { // text 입력이 필요하고 실제로는 object가 입력된 경우, object->text를 삽입합니다.
              prev.prev_result = JSON.stringify(prev.prev_result, null, 2)
              prev.prev_type = typeof(prev.prev_result)
              prev.prev_type2 = ABConvert_IOEnum.text
              prev.prev_processor = "stream to text"
            }
            else if (abReplaceProcessor.process_param==ABConvert_IOEnum.text &&
              prev.prev_type2==ABConvert_IOEnum.json
            ) {
              prev.prev_type2 = ABConvert_IOEnum.text
              prev.prev_processor = "json to text"
            }
            else{
              console.warn(`프로세서 입력 타입 오류, id:${abReplaceProcessor.id}, virtualParam:${abReplaceProcessor.process_param}, realParam:${prev.prev_type2}`);
              break
            }
          }

          // (2) 프로세서 실행
          prev.prev_result = abReplaceProcessor.process(el, item_header, prev.prev_result)
          prev.prev_type = typeof(prev.prev_result)
          prev.prev_type2 = abReplaceProcessor.process_return as ABConvert_IOEnum
          prev.prev_processor = abReplaceProcessor.process

          // (3) 출력 타입 확인
          // if(typeof(prev_result) == "string"){prev_type = ABConvert_IOEnum.text}
          // 아래 줄은 아래 아래 줄로 대체되었습니다. 아래 줄은 mdit/jsdom 환경에서 오류를 발생시킬 수 있습니다: Right-hand side of 'instanceof' is not callable
          //else if (prev_result instanceof HTMLElement){prev_type = ABConvert_IOType.el}
          // else if (typeof(prev_result) == "object"){prev_type = ABConvert_IOEnum.el}
          // else {
          //   console.warn(`프로세서 출력 타입 오류, id:${abReplaceProcessor.id}, virtualReturn:${abReplaceProcessor.process_return}, realReturn${prev_type}`);
          //   break
          // }
        }
        else{
          console.warn("프로세서는 process 또는 process_alias 메서드를 구현해야 합니다.")
        }
      }
    }
    return prev
  }

  /**
   * 하위 함수, 후처리/꼬리 처리, 주로 끝에 명령 추가
   */
  private static autoABConvert_last (el:HTMLDivElement, header:string, selectorName:string, prev:any):any{
    // text 내용인 경우, md 렌더러를 제공합니다.
    if (prev.prev_type == "string" && prev.prev_type2 == ABConvert_IOEnum.text) {
      const subEl = document.createElement("div"); el.appendChild(subEl);
      ABConvertManager.getInstance().m_renderMarkdownFn(prev.prev_result as string, subEl);
      prev.prev_result = el; prev.prev_type = "object"; prev.prev_type2 = ABConvert_IOEnum.el; prev.process = "md";
    }
    // json 내용/배열 내용인 경우, 코드 블록으로 표시
    else if (prev.prev_type == "string" && prev.prev_type2 == ABConvert_IOEnum.json) {
      const code_str:string = "```json\n" + prev.prev_result + "\n```\n"
      const subEl = document.createElement("div"); el.appendChild(subEl);
      ABConvertManager.getInstance().m_renderMarkdownFn(code_str, subEl);
      prev.prev_result = el; prev.prev_type = "object"; prev.prev_type2 = ABConvert_IOEnum.el; prev.process = "show_json";
    }
    // 배열 스트림, 코드 블록으로 표시
    else if (prev.prev_type == "object" &&
      (prev.prev_type2 == ABConvert_IOEnum.list_strem || prev.prev_type2 == ABConvert_IOEnum.c2list_strem || prev.prev_type2 == ABConvert_IOEnum.json)
    ) {
      const code_str:string = "```json\n" + JSON.stringify(prev.prev_result, null, 2) + "\n```\n"
      const subEl = document.createElement("div"); el.appendChild(subEl);
      ABConvertManager.getInstance().m_renderMarkdownFn(code_str, subEl);
      prev.prev_result = el; prev.prev_type = "object"; prev.prev_type2 = ABConvert_IOEnum.el; prev.process = "show_listStream";
    }
    else if (prev.prev_type == "object" && prev.prev_type2 == ABConvert_IOEnum.el) {
      return prev
    }
    else {
      console.warn("꼬리에서 다른 타입, 꼬리 프로세서 불가:", prev.prev_type, prev.prev_type2, prev.prev_result)
    }
    return prev
  }
}
