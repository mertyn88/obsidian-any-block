/**
 * AnyBlock 별명 모듈
 * 
 * @detail
 * 
 * 책임 설계상, 이 모듈은 다음과 같이 나뉩니다:
 * - 전처리 부분
 * - 후처리 부분
 * - 연결 자동 어댑터 부분
 * 
 * 하지만 구현상, 여기에는 첫 번째 부분인 "전처리 부분"만 있습니다.
 * 
 * 후자의 두 부분과 conveter 모듈은 현재 결합도가 높아 분리할 수 없습니다.
 * 
 * 주의할 점: 별명 교체의 마지막에는 자신이 대응하는 선택자 접두사를 삭제해야 합니다.
 * 
 * TODO 생각: 별명 시스템을 Converter처럼 일반적인 것으로 만들 수 있을지 생각해보세요. 깊이 파고들 수 있을 것 같습니다.
 * 
 * 1. obsidian에는 Highlightr-Plugin 플러그인이 있어 전역적으로 인식할 수 있습니다. 참고할 수 있습니다.
 * 2. 각 섹션은 선택 가능: 일치하면 아래로 전달/종료
 * 3. 전체가 아닌 부분적으로, 성능 손실을 줄이기 위해 (예: ab 블록 헤더에 전용으로 변환), 물론 이는 헤더에 일치한 후 API를 호출하여 해결할 수 있습니다.
 * 4. 복잡한 변환, 교체 (hightlightr가 갖추지 못한 기능) 이것이 ==이 플러그인이 별명 시스템이라고 불리는 이유입니다==
 * 5. 정규식의 하위 문자열 채우기 (검색 지팡이와 구버전 AB의 별명기와 유사)
 */

import {ABReg} from "./ABReg"

/**
 * 명령어 헤더 이스케이프 보완, 자연어를 명령어로 변환할 수 있습니다.
 * 
 * @detail
 * 
 * De-dependency: 이 함수의 호출을 취소하면 됩니다.
 * 
 * 자연어 명령어 헤더를 명령어 헤더로 변환합니다.
 * 
 * 처리기에 바인딩할까요? 구버전은 alias 옵션을 통해 설정했지만, V3 버전에서는 필요 없습니다.
 * 
 * - 장점
 *   - 별도의 모듈로 존재하며 실제와 분리됩니다.
 *   - 원칙에 부합: 문법 설탕 작업에 사용되는 모든 것은 별도의 문법 설탕 모듈로 처리되어야 하며 비즈니스 코드와 결합되어서는 안 됩니다.
 * - 단점
 *   - 새로운 처리기가 자연어로 트리거되는 문법 설탕을 선언합니다. 그러나 "새로운 처리기" + "새로운 자연어 교체"를 동시에 추가하여 해결할 수 있습니다.
 * 
 * TODO：
 * - 이러한 별명 시스템은 표시할 수 있어야 하며, json으로 묶어야 합니다.
 * - 성능 최적화, 일치하면 replace하고, 미리 종료합니다.
 * - 시작 부분만 일치시키면 성능이 더 좋을까요?
 * 
 * @returns
 * new header
 */
export function autoABAlias (header:string, selectorName:string, content:string): string{
  // 1. 별명 모듈 - 엄격화. 목적은 정규식을 사용하여 전체 단어를 판별하는 것이지만, splic("|")를 사용하지 않고도 가능하도록 하기 위함
  if (!header.trimEnd().endsWith("|")) header = header + "|"
  if (!header.trimStart().startsWith("|")) header = "|" + header

  // 2. 별명 모듈 - 선택자 유형 표시
  if (selectorName == "mdit") { // `:::`는 본문에 없으므로 판별할 수 없음: if (ABReg.reg_mdit_head_noprefix.test(content.trimStart()))
    header = "|::: 140lne" + header.trimStart()
  }
  else if (selectorName == "list" || ABReg.reg_list_noprefix.test(content.trimStart())) {
    header = "|list 140lne" + header
  }
  else if (selectorName == "heading" || ABReg.reg_heading_noprefix.test(content.trimStart())) {
    header = "|heading 140lne" + header
  }
  else if (selectorName == "code" || ABReg.reg_code_noprefix.test(content.trimStart())) {
    header = "|code 140lne" + header
  }
  else if (selectorName == "quote" || ABReg.reg_quote_noprefix.test(content.trimStart())) {
    header = "|quote 140lne" + header
  }
  else if (selectorName == "table" || ABReg.reg_table_noprefix.test(content.trimStart())) {
    header = "|table 140lne" + header
  }

  // 3. 별명 모듈 - 별명 교체
  for (const item of ABAlias_json) {
    header = header.replace(item.regex, item.replacement)
  }
  for (const item of ABAlias_json_withSub) { // 특수 그룹, 결과를 서브스트링으로 대체
    header = header.replace(item.regex, (match, ...groups) => {
      return item.replacement.replace(/\$(\d+)/g, (_, number) => groups[number - 1]); // 캡처 그룹을 기반으로 교체
    });
  }
  for (const item of ABAlias_json_end) { // ABAlias_json 내용이 확장된 후에도 이 부분의 교체 규칙이 마지막에 유지되도록 보장
    header = header.replace(item.regex, item.replacement)
  }

  return header
}

interface ABAlias_json_item {
  regex: RegExp|string,
  replacement: string
}

// 매개변수를 받는 부분 (이 부분의 반복은 성능을 위해 별도로 빼냄)
const ABAlias_json_withSub: ABAlias_json_item[] = [
  { regex: /\|::: 140lne\|(info|note|warn|warning|error)\s?(.*?)\|/, replacement: "|add([!$1] $2)|quote|" },
]

// mdit 블록
const ABAlias_json_mdit: ABAlias_json_item[] = [
  // {regex: "|::: 140lne|info|", replacement: "|add([!info])|quote|"},
  // {regex: "|::: 140lne|note|", replacement: "|add([!note])|quote|"},
  // {regex: /\|::: 140lne\|(warn|warning)\|/, replacement: "|add([!warning])|quote|"},
  // {regex: "|::: 140lne|error|", replacement: "|add([!error])|quote|"},
  {regex: /\|::: 140lne\|(2?tabs?|탭?)\|/, replacement: "|mditTabs|"},
  {regex: "|::: 140lne|demo|", replacement: "|mditDemo|"},
  {regex: "|::: 140lne|abDemo|", replacement: "|mditABDemo|"},
  {regex: /\|::: 140lne\|(2?col|열)\|/, replacement: "|mditCol|"},
  {regex: /\|::: 140lne\|(2?card|카드)\|/, replacement: "|mditCard|"},
]

// 제목 블록
const ABAlias_json_title: ABAlias_json_item[] = [
  {regex: "|title2list|", replacement: "|title2listdata|listdata2strict|listdata2list|"},

  // title - list&title
  {regex: /\|heading 140lne\|2?(timeline|타임라인)\|/, replacement: "|title2timeline|"},
  {regex: /\|heading 140lne\|2?(tabs?|탭?)\||\|title2tabs?\|/, replacement: "|title2c2listdata|c2listdata2tab|"},
  {regex: /\|heading 140lne\|2?(col|열)\||\|title2col\|/, replacement: "|title2c2listdata|c2listdata2items|addClass(ab-col)|"},
  {regex: /\|heading 140lne\|2?(card|카드)\||\|title2card\|/, replacement: "|title2c2listdata|c2listdata2items|addClass(ab-card)|"},
  {regex: /\|heading 140lne\|2?(nodes?|노드)\||\|(title2node|title2abMindmap)\|/, replacement: "|title2listdata|listdata2strict|listdata2nodes|"},

  // list  - 다중 분기 다층 트리
  {regex: /\|heading 140lne\|2?(flow|플로우차트)\|/, replacement: "|title2list" + "|list2mermaid|"},
  {regex: /\|heading 140lne\|2?(puml)?(mindmap|마인드맵|생각지도)\|/, replacement: "|title2list" + "|list2pumlMindmap|"},
  {regex: /\|heading 140lne\|2?(markmap|mdMindmap|md마인드맵|md생각지도)\|/, replacement: "|title2list" + "|list2markmap|"},
  {regex: /\|heading 140lne\|2?(wbs|(작업)?분해(도|구조))\|/, replacement: "|title2list" + "|list2pumlWBS|"},
  {regex: /\|heading 140lne\|2?(table|다중방향테이블|다중교차테이블|테이블?|다중분기테이블?|교차테이블?)\|/, replacement: "|title2list" + "|list2table|"},

  // list - lt 트리 (다층 단일 분기 트리)
  {regex: /\|heading 140lne\|2?(lt|리스트테이블|트리테이블|리스트그리드|트리그리드|리스트형테이블|트리형테이블?)\|/, replacement: "|title2list" + "|list2lt|"},
  {regex: /\|heading 140lne\|2?(list|리스트)\|/, replacement: "|title2list" + "|list2lt|addClass(ab-listtable-likelist)|"},
  {regex: /\|heading 140lne\|2?(dir|디렉토리트리|디렉토리구조?)\|/, replacement: "|title2list" + "|list2dt|"},

  // list - 이층 트리
  {regex: /\|heading 140lne\|(fakeList|가짜리스트)\|/, replacement: "|title2list" + "|list2table|addClass(ab-table-fc)|addClass(ab-table-likelist)|"},
]

// 리스트 블록
const ABAlias_json_list: ABAlias_json_item[] = [
  {regex: "|listXinline|", replacement: "|list2listdata|listdata2list|"},

  // list - list&title
  {regex: /\|list 140lne\|2?(timeline|타임라인)\|/, replacement: "|list2timeline|"},
  {regex: /\|list 140lne\|2?(tabs?|탭?)\||\|list2tabs?\|/, replacement: "|list2c2listdata|c2listdata2tab|"},
  {regex: /\|list 140lne\|2?(col|열)\||\|list2col\|/, replacement: "|list2c2listdata|c2listdata2items|addClass(ab-col)|"},
  {regex: /\|list 140lne\|2?(card|카드)\||\|list2card\|/, replacement: "|list2c2listdata|c2listdata2items|addClass(ab-card)|"},
  {regex: /\|list 140lne\|2?(nodes?|노드)\||\|(list2node|list2abMindmap)\|/, replacement: "|list2listdata|listdata2strict|listdata2nodes|"},

  // list  - 다중 분기 다층 트리
  {regex: /\|list 140lne\|2?(flow|플로우차트)\|/, replacement: "|list2mermaid|"},
  {regex: /\|list 140lne\|2?(puml)?(mindmap|마인드맵|생각지도)\|/, replacement: "|list2pumlMindmap|"},
  {regex: /\|list 140lne\|2?(markmap|mdMindmap|md마인드맵|md생각지도)\|/, replacement: "|list2markmap|"},
  {regex: /\|list 140lne\|2?(wbs|(작업)?분해(도|구조))\|/, replacement: "|list2pumlWBS|"},
  {regex: /\|list 140lne\|2?(table|다중방향테이블|다중교차테이블|테이블?|다중분기테이블?|교차테이블?)\|/, replacement: "|list2table|"},

  // list - lt 트리 (다층 단일 분기 트리)
  {regex: /\|list 140lne\|2?(lt|리스트테이블|트리테이블|리스트그리드|트리그리드|리스트형테이블|트리형테이블?)\|/, replacement: "|list2lt|"},
  {regex: /\|list 140lne\|2?(list|리스트)\|/, replacement: "|list2lt|addClass(ab-listtable-likelist)|"},
  {regex: /\|list 140lne\|2?(dir|디렉토리트리|디렉토리구조?)\|/, replacement: "|list2dt|"},

  // list - 이층 트리
  {regex: /\|list 140lne\|(fakeList|가짜리스트)\|/, replacement: "|list2table|addClass(ab-table-fc)|addClass(ab-table-likelist)|"},
]

// 코드 블록
const ABAlias_json_code: ABAlias_json_item[] = [
  {regex: "|code 140lne|X|", replacement: "|Xcode|"},
]

// 인용 블록
const ABAlias_json_quote: ABAlias_json_item[] = [
  {regex: "|quote 140lne|X|", replacement: "|Xquote|"},
]

// 테이블 블록
const ABAlias_json_table: ABAlias_json_item[] = [
]

// 일반적으로 데코레이터 처리기
const ABAlias_json_general: ABAlias_json_item[] = [
  {regex: "|검은막|", replacement: "|add_class(ab-deco-heimu)|"},
  {regex: "|접기|", replacement: "|fold|"},
  {regex: "|스크롤|", replacement: "|scroll|"},
  {regex: "|초과 접기|", replacement: "|overfold|"},
  // 편의 스타일
  {regex: "|빨간 글자|", replacement: "|addClass(ab-custom-text-red)|"},
  {regex: "|주황 글자|", replacement: "|addClass(ab-custom-text-orange)|"},
  {regex: "|노란 글자|", replacement: "|addClass(ab-custom-text-yellow)|"},
  {regex: "|초록 글자|", replacement: "|addClass(ab-custom-text-green)|"},
  {regex: "|청록 글자|", replacement: "|addClass(ab-custom-text-cyan)|"},
  {regex: "|파란 글자|", replacement: "|addClass(ab-custom-text-blue)|"},
  {regex: "|보라 글자|", replacement: "|addClass(ab-custom-text-purple)|"},
  {regex: "|흰 글자|", replacement: "|addClass(ab-custom-text-white)|"},
  {regex: "|검은 글자|", replacement: "|addClass(ab-custom-text-black)|"},
  {regex: "|빨간 배경|", replacement: "|addClass(ab-custom-bg-red)|"},
  {regex: "|주황 배경|", replacement: "|addClass(ab-custom-bg-orange)|"},
  {regex: "|노란 배경|", replacement: "|addClass(ab-custom-bg-yellow)|"},
  {regex: "|초록 배경|", replacement: "|addClass(ab-custom-bg-green)|"},
  {regex: "|청록 배경|", replacement: "|addClass(ab-custom-bg-cyan)|"},
  {regex: "|파란 배경|", replacement: "|addClass(ab-custom-bg-blue)|"},
  {regex: "|보라 배경|", replacement: "|addClass(ab-custom-bg-purple)|"},
  {regex: "|흰 배경|", replacement: "|addClass(ab-custom-bg-white)|"},
  {regex: "|검은 배경|", replacement: "|addClass(ab-custom-bg-black)|"},
  {regex: "|위로 정렬|", replacement: "|addClass(ab-custom-dire-top)|"},
  {regex: "|아래로 정렬|", replacement: "|addClass(ab-custom-dire-down)|"},
  {regex: "|왼쪽 정렬|", replacement: "|addClass(ab-custom-dire-left)|"},
  {regex: "|오른쪽 정렬|", replacement: "|addClass(ab-custom-dire-right)|"},
  {regex: "|중앙 정렬|", replacement: "|addClass(ab-custom-dire-center)|"},
  {regex: "|수평 중앙 정렬|", replacement: "|addClass(ab-custom-dire-hcenter)|"},
  {regex: "|수직 중앙 정렬|", replacement: "|addClass(ab-custom-dire-vcenter)|"},
  {regex: "|양쪽 정렬|", replacement: "|addClass(ab-custom-dire-justify)|"},
  {regex: "|큰 글자|", replacement: "|addClass(ab-custom-font-large)|"},
  {regex: "|매우 큰 글자|", replacement: "|addClass(ab-custom-font-largex)|"},
  {regex: "|매우 매우 큰 글자|", replacement: "|addClass(ab-custom-font-largexx)|"},
  {regex: "|작은 글자|", replacement: "|addClass(ab-custom-font-small)|"},
  {regex: "|매우 작은 글자|", replacement: "|addClass(ab-custom-font-smallx)|"},
  {regex: "|매우 매우 작은 글자|", replacement: "|addClass(ab-custom-font-smallxx)|"},
  {regex: "|굵게|", replacement: "|addClass(ab-custom-font-bold)|"},
]

export const ABAlias_json_default: ABAlias_json_item[] = [
  ...ABAlias_json_mdit,
  ...ABAlias_json_title,
  ...ABAlias_json_list,
  ...ABAlias_json_code,
  ...ABAlias_json_quote,
  ...ABAlias_json_table,
  ...ABAlias_json_general, // 이 부분을 마지막에 두는 것이 중요
]

// 임시로 처음에만 교체
export let ABAlias_json: ABAlias_json_item[] = [
  ...ABAlias_json_default // 설정에 따라 사용 중지 여부 결정
]

const ABAlias_json_end: ABAlias_json_item[] = [
  {regex: "|::: 140lne", replacement: ""},
  {regex: "|heading 140lne", replacement: ""},
  {regex: "|list 140lne", replacement: ""},
  {regex: "|code 140lne", replacement: ""},
  {regex: "|qutoe 140lne", replacement: ""},
  {regex: "|table 140lne", replacement: ""},
]
