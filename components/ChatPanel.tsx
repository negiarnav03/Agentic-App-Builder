"use client";

import { Message, StatusStep } from '@/types/workspace';
import React, { useRef, useState } from 'react'
import Image from 'next/image';
import { BlueTitle } from './resuables';
import PricingModal from './PricingModal';
import { cn } from '@/lib/utils';
import { Loader2, WheatIcon } from 'lucide-react';


interface ChatPanelProps {
   messages: Message[];
   isGenerating: boolean;
   isImproving: boolean;
   statusLog: StatusStep[];
   credits: number;
   initialPrompt: string | null;
   onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
   userId: string;
   wordspaceId: string | null;
   appTitle: string | null;
}

const ChatPanel = ({
   messages,
   isGenerating,
   isImproving,
   statusLog,
   credits,
   initialPrompt,
   onGenerate,
   userId,
   wordspaceId,
   appTitle,
}: ChatPanelProps) => {

   const scrollRef = useRef<HTMLDivElement>(null);
   const textareaRef = useRef<HTMLTextAreaElement>(null);

   const [input, setInput] = useState("");
   // todo pending image url
   // todo isUploading state

   const hasAutoSubmitRef = useRef(false);
   const noCredits = credits <= 0;
   const canSubmit = input.trim().length > 0 && !isImproving && !noCredits;

   const msgs = [
      { role: "assistant", content: "Hey there,\n I'm Pixel an AI app builder that will build any app ..." },
      { role: "user", content: "Build me aSpotify stats dashboard with charts" },
      { role: "assistant", content: "Sure, here's what I came up with: ..." }

   ]

   const statuses = [
      { label: "Planning the component structure", status: "done" },
      { label: "Writing App.js and components", status: "done" },
      { label: "Validating pakages...", status: "running" },
   ]

   return (
      <div className='flex w-[320px] shrink-0 flex-col bg-[#0d0d0d]' >

         <div className='flex items-center justify-between border-b border-white/6 px-4 py-3'>
            <BlueTitle>{appTitle}</BlueTitle>
            <PricingModal reason={noCredits ? "credits" : "upgrade"}>
               <span
                  className={cn(
                     "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                     noCredits
                        ? "bg-red-500/15 text-red-400/80 hover:bg-red-500/25 "
                        : "bg-white/6 text-white/30 hover:bg-white/10 hover:text-white/50",
                  )}
               >
                  {noCredits
                     ? "No credits . upgrade"
                     : `${credits} credits${credits !== 1 ? "s" : ""}`
                  }

               </span>
            </PricingModal>
         </div>
         {/* messages */}

         <div
            ref={scrollRef}
            className='flex-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:hidden'
         >
            {messages.length === 0 && !isGenerating && (
               <div className='flex h-full items-center justify-center'>
                  <p className='text-center text-xs text-white/20'>
                     Describe what you want to build... hover to see the
                  </p>
               </div>
            )}

            <div className='space-y-4'>
               {messages.map((msg, i) => (
                  <div key={i}>
                     {msg.role === "user" ? (
                        <div className='flex items-start justify-end gap-2'>
                           <div className='max-w-[85%] space-y-1.5'>
                              {/* todo show msg img url */}
                              <div className='rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2.5'>
                                 <p className='text-[13px] leading-relaxed text-white/80 wrap-break-word'>{msg.content}</p>
                              </div>

                           </div>
                        </div>
                     ) : (
                        <div className='flex items-start gap-2'>
                           <Image
                              src="/logo-short.jpeg"
                              alt="forege"
                              width={24}
                              height={24}
                              className="mt-0.5 h-6 w-6 shrink-0 rounded-md"
                           />
                           <div className='min-w-0 rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5'>
                              <p className='text-[13px] leading-relaxed text-white/70 wrap-break-word'>{msg.content}</p>
                           </div>
                        </div>
                     )}
                  </div>
               ))}
            </div>

            {/* status steps - shown while generating */}

            {isGenerating && <div className='flex items-start gap-2'>
               <Image
                  src="/logo-short.jpeg"
                  alt="forege"
                  width={24}
                  height={24}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-md"
               />

               <div className='rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-3'>
               <div className='space-y-2'>
                  {statusLog.map((step,i)=>(
                     <div key={i} className='flex items-center gap-2.5'>
                       <div className='flex h-4 w-4 shrink-0 items-center justify-center'>
                        {step.status === "running"?(
                           <Loader2 className='h-3 w-3 animate-spin text-blue-400/80'/>
                        ):(
                           <svg
                           className="h-3 w-3 text-white/25"
                           viewBox="0 0 12 12"
                           fill="none"
                           >
                              <path
                              d="M2 6l3 3 5-5"
                              stroke= "currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              />
                           </svg>
                        )
                        )}

                        </div>
                        </div>
                  ))}
               </div>


               </div>
            </div>}



         </div>
      </div>
   )
}

export default ChatPanel;