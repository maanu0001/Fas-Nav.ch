import { cache } from "react";
import type { OrganizationType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getOrganizationForPreview } from "@/lib/queries/organization";

/** Visible only to authenticated members of the draft organization or staff. */
export const getOwnedDraftBySlug=cache(async (slug:string,type:OrganizationType)=>{
 const session=await auth();
 const user=session?.user;
 if(!user?.id||!user.isActive)return null;
 const org=await prisma.organization.findFirst({where:{slug,type,status:{not:"PUBLISHED"}},select:{id:true}});
 if(!org)return null;
 if(!isStaff(user.role)){
   const access=await prisma.membership.findUnique({where:{userId_organizationId:{userId:user.id,organizationId:org.id}},select:{userId:true}});
   if(!access)return null;
 }
 return getOrganizationForPreview(org.id);
});
