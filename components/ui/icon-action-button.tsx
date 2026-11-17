"use client";

import type {ButtonHTMLAttributes} from "react";
import {ActionIcon, type ActionIconName} from "@/components/ui/action-icon";

export type IconActionTone="neutral"|"edit"|"danger"|"success";
export type IconActionButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,"children"> & {
  icon:ActionIconName;
  label:string;
  tone?:IconActionTone;
};

/**
 * Padrão visual Consult Services para ações compactas de manutenção.
 * Ícone visível em botão 44x44, com hover/focus, aria-label e title.
 * A cor complementa o significado, sem substituir o texto acessível.
 * A confirmação e a autorização de CRUD ficam no chamador e no servidor.
 */
export function IconActionButton({
 icon,label,tone="neutral",className="",type="button",...props
}:IconActionButtonProps) {
 const toneClass={
  neutral:"cs-icon-action--neutral",
  edit:"cs-icon-action--edit",
  danger:"cs-icon-action--danger",
  success:"cs-icon-action--success",
 }[tone];
 return <button {...props} type={type} aria-label={label} title={props.title??label}
  className={`cs-icon-action ${toneClass} ${className}`.trim()}>
  <ActionIcon name={icon} width={20} height={20}/>
 </button>;
}
