/**
 * 변환기_텍스트 버전
 * 
 * md_str <-> md_str
 */

import {ABConvert_IOEnum, ABConvert, type ABConvert_SpecSimp} from "./ABConvert"
import {ABConvertManager} from "../ABConvertManager"
import {ABReg} from "../ABReg"

/**
 * registerABProcessor의 호출을 두 단계로 나누는 이유는:
 * 1. 개요에서 원하는 프로세서를 빠르게 찾을 수 있도록 하기 위해
 * 2. 프로세서가 서로 호출할 수 있도록 하기 위해
 */

const abc_quote = ABConvert.factory({
  id: "quote",
  name: "인용 블록 추가",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    return content.split("\n").map((line)=>{return "> "+line}).join("\n")
  }
})

const abc_code = ABConvert.factory({
  id: "code",
  name: "코드 블록 추가",
  match: /^code(\((.*)\))?$/,
  default: "code()",
  detail: "`()`를 추가하지 않으면 원본 텍스트의 첫 번째 줄을 코드 유형으로 사용하며, 괄호 유형이 비어 있으면 코드 유형이 비어 있음을 나타냅니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    let matchs = header.match(/^code(\((.*)\))?$/)
    if (!matchs) return content
    if (matchs[1]) content = matchs[2]+"\n"+content
    return "```"+content+"\n```"
  }
})

const abc_Xquote = ABConvert.factory({
  id: "Xquote",
  name: "인용 블록 제거",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    return content.split("\n").map(line=>{
      return line.replace(/^>\s/, "")
    }).join("\n")
  }
})

const abc_Xcode = ABConvert.factory({
  id: "Xcode",
  name: "코드 블록 제거",
  match: /^Xcode(\((true|false|)\))?$/,
  default: "Xcode(true)",
  detail: "매개변수는 코드 유형을 제거할지 여부를 나타내며, Xcode의 기본값은 false이고, Xcode의 기본값은 true입니다. 표기법: code|Xcode 또는 code()|Xcode() 내용은 변경되지 않습니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    let matchs = header.match(/^Xcode(\((true|false|)\))?$/)
    if (!matchs) return content
    let remove_flag:boolean
    if (matchs[1]=="") remove_flag=false
    else remove_flag= (matchs[2]!="false")
    let list_content = content.split("\n")
    // 시작 제거
    let code_flag = ""
    let line_start = -1
    let line_end = -1
    for (let i=0; i<list_content.length; i++){
      if (code_flag==""){     // 시작 표시 찾기
        const match_tmp = list_content[i].match(ABReg.reg_code)
        if(match_tmp){
          code_flag = match_tmp[3]
          line_start = i
        }
      }
      else {                  // 종료 표시 찾기
        if(list_content[i].indexOf(code_flag)>=0){
          line_end = i
          break
        }
      }
    }
    if(line_start>=0 && line_end>0) { // 시작은 있지만 끝이 없는 경우를 방지
      if(remove_flag) list_content[line_start] = list_content[line_start].replace(/^```(.*)$|^~~~(.*)$/, "")
      else list_content[line_start] = list_content[line_start].replace(/^```|^~~~/, "")
      list_content[line_end] = list_content[line_end].replace(/^```|^~~~/, "")
      content = list_content.join("\n")//.trim()
    }
    return content
  }
})

const abc_X = ABConvert.factory({
  id: "X",
  name: "코드 또는 인용 블록 제거",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    let flag = ""
    for (let line of content.split("\n")){
      if (ABReg.reg_code.test(line)) {flag="code";break}
      else if (ABReg.reg_quote.test(line)) {flag="quote";break}
    }
    if (flag=="code") return abc_Xcode.process(el, header, content) as string
    else if (flag=="quote") return abc_Xquote.process(el, header, content) as string
    return content
  }
})

// TODO 새로운 별명 시스템을 사용해야 합니다.
// const abc_code2quote = ABConvert.factory({
//   id: "code2quote",
//   name: "코드를 인용 블록으로 변환",
//   process_alias: "Xcode|quote",
//   process: ()=>{}
// })

// const abc_quote2code = ABConvert.factory({
//   id: "quote2code",
//   name: "인용을 코드 블록으로 변환",
//   match: /^quote2code(\((.*)\))?$/,
//   default: "quote2code()",
//   process_alias: "Xquote|code%1",
//   process: ()=>{
//     /*let matchs = header.match(/^quote2code(\((.*)\))?$/)
//     if (!matchs) return content
//     content = text_Xquote(content)
//     if (matchs[1]) content = matchs[2]+"\n"+content
//     content = text_code(content)
//     return content*/
//   }
// })

const abc_slice = ABConvert.factory({
  id: "slice",
  name: "슬라이스",
  match: /^slice\((\s*\d+\s*?)(,\s*-?\d+\s*)?\)$/,
  detail: "js의 slice 메서드와 동일합니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    // slice는 오버플로우나 교차를 두려워하지 않으며, 자동으로 빈 배열로 변환됩니다. 많은 것을 판단할 필요가 없어 매우 편리합니다.
    const list_match = header.match(/^slice\((\s*\d+\s*)(,\s*-?\d+\s*)?\)$/)
    if (!list_match) return content
    const arg1 = Number(list_match[1].trim())
    if (isNaN(arg1)) return content
    const arg2 = Number(list_match[2].replace(",","").trim())
    // 단일 매개변수
    if (isNaN(arg2)) {
      return content.split("\n").slice(arg1).join("\n")
    }
    // 두 개의 매개변수
    else {
      return content.split("\n").slice(arg1, arg2).join("\n")
    }
  }
})

const abc_add = ABConvert.factory({
  id: "add",
  name: "내용 추가",
  match: /^add\((.*?)(,\s*-?\d+\s*)?\)$/,
  detail: "추가. 매개변수 2는 행 순서이며, 기본값은 0이고, 행 끝은 -1입니다. 행을 삽입하여 추가합니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    const list_match = header.match(/^add\((.*?)(,\s*-?\d+\s*)?\)$/)
    if (!list_match) return content
    if (!list_match[1]) return content
    const arg1 = (list_match[1].trim())
    if (!arg1) return content
    let arg2:number
    if (!list_match[2]) arg2 = 0
    else{
      arg2 = Number(list_match[2].replace(",","").trim())
      if (isNaN(arg2)) {
        arg2 = 0
      }
    }
    const list_content = content.split("\n")
    if (arg2>=0 && arg2<list_content.length) list_content[arg2] = arg1+"\n"+list_content[arg2]
    else if(arg2<0 && (arg2*-1)<=list_content.length) {
      arg2 = list_content.length+arg2
      list_content[arg2] = arg1+"\n"+list_content[arg2]
    }
    return list_content.join("\n")
  }
})

const abc_listroot = ABConvert.factory({
  id: "listroot",
  name: "목록 루트 추가",
  match: /^listroot\((.*)\)$/,
  default: "listroot(root)",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    const list_match = header.match(/^listroot\((.*)\)$/)
    if (!list_match) return content
    const arg1 = list_match[1].trim()
    content = content.split("\n").map(line=>{return "  "+line}).join("\n")
    content = "- "+arg1+"\n"+content
    return content
  }
})

const abc_callout = ABConvert.factory({
  id: "callout",
  name: "callout 문법 설탕",
  match: /^\!/,
  default: "!note",
  detail: "obsidian 0.14 버전 이상이 callout 문법을 지원해야 합니다.",
  process_param: ABConvert_IOEnum.text,
  process_return: ABConvert_IOEnum.text,
  process: (el, header, content: string): string=>{
    // 이전 작성 방식은 ad 플러그인이 필요했으며, 여기서는 더 일반적인 callout 문법으로 변경해야 합니다.
    // return "```ad-"+header.slice(1)+"\n"+content+"\n```"
    
    header = header.slice(1)
    let callout_type = "[!note]"
    if (header.startsWith("note_")) {callout_type = "[!note]"; header.slice(5);}
    else if (header.startsWith("warn_")) {callout_type = "[!warning]"; header.slice(5);}
    else if (header.startsWith("warning_")) {callout_type = "[!warning]"; header.slice(8);}
    else if (header.startsWith("error_")) {callout_type = "[!error]"; header.slice(6);}

    return `> ${callout_type} ${header}\n` + content.split("\n").map(line=>{return "> "+line}).join("\n")
  }
})
