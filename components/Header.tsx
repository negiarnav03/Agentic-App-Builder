import Link from 'next/link'
import React from 'react'
import Image from 'next/image'
import { ArrowRight, Ghost, Zap } from 'lucide-react';
import {Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Button } from './ui/button';
import PricingModal from './ui/PricingModal';


const Header = () => {
  return (
  <header className=' w-full fixed top-0 left-0 z-50 height-16  border-b border-white/6 bg-white/7 backdrop-blur-md '>
    <nav className='mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6'>
        <Link href="/">
        <Image src="/logo.png" alt="logo" width={24} height={24}
        className='h-9 w-auto rounded-md'/>
        </Link>

        <div className='flex items-center gap-5'>

            <Show when="signed-in">
              
              <Link href={"/projects"} 
            className='text-[13] font-medium transition-colors hover:text-white/80'
            > 
            Projects</Link>

<PricingModal>
            <span className='inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70'>
                <Zap className='h-3 w-3 fill-white/70'/>
                3 / 40 credits
            </span>
</PricingModal>
            <UserButton />
            </Show>

            

            <Show when="signed-out">
              <SignInButton mode='modal'>
                <Button variant="ghost" size="sm" className='hover:text-white/80'>
                    Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode='modal'>
                <Button  size="sm" className={"-8 rounded-full font-semibold active:scale-95 px-4 pt-1"}>
                    Get Started
                    <ArrowRight className='h-3 w-3 opacity-60'/>
                </Button>
              </SignUpButton>
            </Show>
            

            
          
        </div>
    </nav>
  </header>
  );
}

export default Header