/**
 * 정규 표현식 매칭 규칙
 * 
 * @attention 주의: 정규 표현식을 수정할 때 소괄호의 위치가 맞는지 주의해야 합니다. 그렇지 않으면 인덱스를 수정해야 합니다.
 */
export const ABReg = {
  /**
   * AB 블록 헤더
   *
   * 예시: `    > - > %%[d]:%%   `
   * 
   * - 접두사 부분
   *     - $1: 접두사 | `    > - >  ` | ((\s|>\s|-\s|\*\s|\+\s)*)
   *     - $2: 무용 | `>`           | (\s|>\s|-\s|\*\s|\+\s)
   * - 명령어 부분
   *     - $3: 무용 | `%%`          | (%%)?
   *     - $4：무용 | `[header]`    | (\[((?!toc)[0-9a-zA-Z].*)\])
   *     - $5：명령어 | `header`      | (?!toc)[0-9a-zA-Z].*)
   *     - $6: 무용 | `%%`          | (%%)?
   * 
   * 주의:
   * - (?!\[) (?!\toc) 이런 후방 부정 구문은 매칭 항목으로 간주되지 않습니다.
   * - `%%`와 `:`를 허용하는 규칙은 V3에 새로 추가되었습니다.
   */
  // 접두사 버전 (선택자용)
  reg_header:   /^((\s|>\s|-\s|\*\s|\+\s)*)(%%)?(\[((?!toc|TOC|< )[\|#0-9a-zA-Z\u4e00-\u9fa5].*)\]):?(%%)?\s*$/, // 빈 `|`로 첫 문자 제한을 해제할 수 있습니다. (`|` 주의: 엄격 모드로 사용할 수 있으며, `#` 주의: 뒤에 한 칸 띄워서 "태그"로 변하지 않도록 권장, `!` 주의: `> [!note]`로 오인되지 않도록 주의
  reg_header_up:/^((\s|>\s|-\s|\*\s|\+\s)*)(%%)?(\[((?!toc|TOC)< [\|#0-9a-zA-Z\u4e00-\u9fa5].*)\]):?(%%)?\s*$/,  // 위로 검사하는 헤더 선택자
  reg_mdit_head:/^((\s|>\s|-\s|\*\s|\+\s)*)(:::)\s?(.*)/,         // TODO `::::*`로 변경해야 함
  reg_mdit_tail:/^((\s|>\s|-\s|\*\s|\+\s)*)(:::)/,

  reg_list:     /^((\s|>\s|-\s|\*\s|\+\s)*)(-\s|\*\s|\+\s)(.*)/,  //: /^\s*(>\s)*-\s(.*)$/
  reg_code:     /^((\s|>\s|-\s|\*\s|\+\s)*)(```|~~~)(.*)/,      //: /^\s*(>\s|-\s)*(```|~~~)(.*)$/ // TODO ` "```*")로 변경해야 함
  reg_quote:    /^((\s|>\s|-\s|\*\s|\+\s)*)(>\s)(.*)/,          // `- > `는 매칭되지 않으며, 이를 목록으로 간주해야 함
  reg_heading:  /^((\s|>\s|-\s|\*\s|\+\s)*)(\#+\s)(.*)/,
  reg_table:    /^((\s|>\s|-\s|\*\s|\+\s)*)(\|(.*)\|)/,

  // 접두사 없는 버전 (처리기용, 처리기는 접두사를 처리할 필요가 없으며, 접두사는 선택자 단계에서 이미 제거됨)
  reg_header_noprefix:   /^((\s)*)(%%)?(\[((?!toc|TOC|< )[\|#0-9a-zA-Z\u4e00-\u9fa5].*)\]):?(%%)?\s*$/,
  reg_header_up_noprefix:/^((\s)*)(%%)?(\[((?!toc|TOC)< [\|#0-9a-zA-Z\u4e00-\u9fa5].*)\]):?(%%)?\s*$/,
  reg_mdit_head_noprefix:/^((\s)*)(:::)\s?(.*)/,
  reg_mdit_tail_noprefix:/^((\s)*)(:::)/,

  reg_list_noprefix:     /^((\s)*)(-\s|\*\s|\+\s)(.*)/,
  reg_code_noprefix:     /^((\s)*)(```|~~~)(.*)/,      
  reg_quote_noprefix:    /^((\s)*)(>\s)(.*)/,          
  reg_heading_noprefix:  /^((\s)*)(\#+\s)(.*)/,         
  reg_table_noprefix:    /^((\s)*)(\|(.*)\|)/,

  reg_emptyline_noprefix:/^\s*$/,
  reg_indentline_noprefix:/^\s+?\S/,

  inline_split: /\| |,  |， |\.  |。 |:  |： /, // 인라인 분할. `|` 또는 전각 기호 + 한 칸, 반각 기호 + 두 칸 (후자는 공백 압축으로 인해 재렌더링을 거치면 문제가 있을 수 있음)
}

/**
 * ABConvert의 설정
 * 
 * @detail
 * obsidian의 설정으로 덮어쓸 수 있으며, GUI 설정 페이지가 없으면 수동으로 수정할 수 있습니다.
 */
export let ABCSetting: {is_debug: boolean, global_ctx: any} = {
  is_debug: false,
  global_ctx: null // MarkdownPostProcessorContext 타입, obsidian 전용
}
