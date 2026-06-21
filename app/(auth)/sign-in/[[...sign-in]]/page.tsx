// the is the catch all route
// it is used when we go to any route that starts with signin/anything eg signin/signup and the route doesn't start with any specific route in the (auth)/signin folder



import { SignIn } from '@clerk/nextjs'; 
import React from 'react';

const SignInPage =() =>{
 return <SignIn/>

}
export default SignInPage