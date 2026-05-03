const User=require("../models/User");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

exports.register=async(req,res)=>{
    try {
    const { name, email, password } = req?.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if(password.length<6){
      return res.status(400).json({error:"password must be atleast 6 characters"});
    }

    const existingUser=await User.findOne({email:email.toLowerCase()});
    if(existingUser){
      return res.status(400).json({error:"Email already registered"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    //return token on register so user is logged in immediately
    const token=jwt.sign(
      {id:user._id,name:user.name,email:user.email},
      process.env.JWT_SECRET,
      {expiresIn:"7d"} //expires token in 7 days
    )

    res.status(201).json({ 

      token,
      user:{_id:user._id,name:user.name,email:user.email}
     });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

exports.login=async(req,res)=>{
    try{
        const{email,password}=req?.body||{};
        if (!email || !password) {
         return res.status(400).json({ error: "Email and password are required" });
        }
        const user=await User.findOne({email:email.toLowerCase()});
        
        if(!user) return res.status(400).json({
            error:"Invalid email or password"
        });
        const isMatch=await bcrypt.compare(password,user?.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const token = jwt.sign({ id: user._id ,name:user.name,email:user.email}, process.env.JWT_SECRET,
        {expiresIn:"7d"});
        res.json({ 
          token,
          user:{_id:user._id,name:user.name,email:user.email},
        
        });

    }catch(err){
     res.status(500).json({ error: 'Server error during login' });
    }

}

//Get current user

exports.getMe=async(req,res)=>{

  try{
    const user=await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

  }catch(err){
     res.status(500).json({ error: "Server error" });
  }

}