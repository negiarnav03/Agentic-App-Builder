"use client";
import { useCallback, useState } from 'react'
import { CodePanel } from './CodePanel'
import { FileData, Message, StatusStep } from '@/types/workspace';
import ChatPanel from './ChatPanel';

interface WorkspaceClientProps{
    initialPrompt: string | null;
    userCredits: number;
    userId:string;
    userPlan:string;
}

const WorkspaceClient = ({initialPrompt,userCredits,userId,userPlan,
}: WorkspaceClientProps) => {

    const [workspace,setWorkspace] = useState<string | null>(null);
    const [messages,setMessages] = useState<Message[]>([]);
    const [credits,setCredits] = useState(userCredits);
    const [appTitle, setAppTitle] = useState<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [fileData, setFileData] = useState<FileData | null>(null);
    const [statusLog, setStatusLog] = useState<StatusStep[]>([]);

    const handleFilePatch = useCallback((patches: FileData)=>{
        setFileData(patches);
    },[]);

    const handleGenerate = useCallback(
        async(prompt:string, imageUrl?:string)=>{},
        [credits,isGenerating,userId],
    );



    return (
        <div className='flex h-[calc(100vh-4rem)] overflow-hidden bg-[#0a0a0a]'>



            {/* chat panel - left  */}

            <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            isImproving={false}
            statusLog={statusLog}
            credits={credits}
            initialPrompt={initialPrompt}
            onGenerate={handleGenerate}
            userId={userId}
            wordspaceId={workspace}
            appTitle='test title'
            />


            {/* code panel - right */}

            <CodePanel fileData={fileData}
            isGenerating={isGenerating}
            statusLog={statusLog}
            onFilePatch={handleFilePatch}
            />



        </div>
    )
}

export default WorkspaceClient