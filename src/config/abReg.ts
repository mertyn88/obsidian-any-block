/** @attention 修改正则要注意小括号的位置是否对应，不然还要去修改索引 */
export const ABReg = {
  reg_header:   /^((\s|>\s|-\s)*)(\[(.*)\])/,

  reg_headtail: /^((\s|>\s|-\s)*)(:::)(.*)/,
  reg_list:     /^((\s|>\s|-\s)*)(-\s)(.*)/,     //: /^\s*(>\s)*-\s(.*)$/
  reg_code:     /^((\s|>\s|-\s)*)(```|~~~)(.*)/, //: /^\s*(>\s|-\s)*(```|~~~)(.*)$/
  reg_quote:    /^((\s|>\s|-\s)*)(>\s)(.*)/,     // `- > ` 不匹配，要认为这种是列表
  reg_heading:  /^((\s|>\s|-\s)*)(\#+\s)(.*)/,

  reg_emptyline:/^\s*$/,
  reg_indentline:/^\s+?\S/,
}
