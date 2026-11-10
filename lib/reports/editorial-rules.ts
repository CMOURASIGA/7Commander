/** Minimal editorial rule for non-actionable client next steps. Does not infer dates or owners. */
export function isVagueNextStep(title:string,description:string):boolean{
 const text=(title+" "+description).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 return /ver se conseguimos|dar prosseguimento|ver a possibilidade|conversar para ver|tentar avancar/.test(text);
}
