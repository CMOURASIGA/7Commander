"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";

/**
 * Presentation hints from an authenticated server-side capability check.
 * Unknown and failed checks are read-only (fail closed). API guards remain
 * the sole authority for any create, update, delete or tenant switch.
 */
export function useCentralPilotReadOnly(): {
  readOnly:boolean; checking:boolean; canSwitchCompany:boolean
} {
  const [state,setState]=useState({
    readOnly:true,checking:true,canSwitchCompany:false,
  });
  useEffect(()=>{
    let mounted=true;
    void (async()=>{
      try {
        const response=await fetch("/api/auth/ui-capabilities",{
          headers:getClientAuthHeaders(),cache:"no-store",credentials:"same-origin",
        });
        if (!response.ok) throw new Error("Capabilities unavailable");
        const body=await response.json() as {
          readOnly?:boolean;canSwitchCompany?:boolean
        };
        if(mounted)setState({
          readOnly:body.readOnly!==false,
          checking:false,
          canSwitchCompany:body.canSwitchCompany===true,
        });
      } catch {
        if(mounted)setState({readOnly:true,checking:false,canSwitchCompany:false});
      }
    })();
    return()=>{mounted=false};
  },[]);
  return state;
}
