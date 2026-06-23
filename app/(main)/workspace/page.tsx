import WorkspaceClient from '@/components/WorkspaceClient';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import React from 'react'
import { getWorkspaceById, getWorkspaceUser } from '@/actions/workspace';

interface workspacePageProps {
    searchParams:Promise<{prompt?:string;id?:string}>;
}

const WorkspacePage = async({searchParams}:workspacePageProps) => {
    const {userId: clerkId}=await auth();
    if(!clerkId) redirect("/");
    const{prompt,id} = await searchParams;

    const user = await getWorkspaceUser();

    let workspace = null;
    if(id){
        workspace = await getWorkspaceById(id, user.id);
    }

    return (
        <WorkspaceClient
        initialPrompt={prompt?? null}
        userCredits={user.credits}
        userId={user.id}
        userPlan={user.plan}
        workspace={workspace}/>
    )
};


export default WorkspacePage;