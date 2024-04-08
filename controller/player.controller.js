

import transporter from '../mail/mail.js';
import Team from '../model/team.model.js'
import Player from '../model/player.model.js';
import {validationResult} from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const retrievePassword = (request, response, next) =>{
    let email  = request.body.email;
    Player.findOne({email})
    .then(result =>{
        otp = generateOTP();
        let obj = {
            from: 'sb360879@gmail.com',
            to: email,
            subject: 'Sending Email using Node.js',
            text: 'your otp is '+otp
        };
        transporter.sendMail(obj, (error, info) =>{
            return error ? response.status(500).json({error : "Internal server error"}) : response.status(200).json({result: 'email sent'})
        })
    })
    .catch(error =>{
        console.log(error);
        response.status(500).json({error : 'Internal server error'});
    })
}
export const verfiyOTP = (request, response, next) =>{

}
export const acceptRequest = (request, response, next) =>{
    let {playerId, teamId} = request.body;
    
    Player.updateOne({ _id: playerId }, {
            $set: {

                joinStatus: true,
            }
        })
        .then(async result => {
            console.log(result);

            const team = await Team.findOne({
                _id: teamId
            });
            if (!team)
                return response.status(404).json({ message: "Team Not Found" });
            team.players.push(playerId)
            team.save()
                .then(result => {
                    console.log(result);
                    Player.updateOne({ _id: playerId },{
                        $set  : {
                            team : teamId
                        }
                    })
                        .then(result => {
                            return response.status(201).json({ message: "success" });
                        })
                        .catch(err => {
                            return response.status(500).json({ message: "Internal Server Error" });
                        });
                })
                .catch(err => {
                    console.log(err);
                    return response.status(500).json({ message: "Internal Server Error" });
                });

        })
        .catch(err => {
                console.log(err);
                return response.status(500).json({ message: "Internal Server Error" })
            })
}
export const rejectRequest = (request, response, next) => {
    let {playerId, teamId} = request.body;
    Player.updateOne({ _id: playerId }, {
            $pull: {
                requestedTeam: 
                    { teamId }
                
            }
        })
        .then(result => {

            if (result.modifiedCount)
                return response.status(202).json({ message: "Success" });
            else
                return response.status(404).json({ message: "Not Found" })
        })
        .catch(err => {
                console.log(err);
                return response.status(500).json({ message: "Internal Server Error" })
            }

        )

};

function generateOTP() {
    
    return Math.floor(100000 + Math.random() * 900000);
}
export const getAllPlayer = async (request, response, next) =>{
    try {
        let players = await Player.find();
        return response.status(200).json({result : players});

    } catch (error) {
        return response.status(500).json({error : "Internal server error"});
    }

}

export const getPlayerInfo = async (request, response, next) =>{
    try{
        let id  = request.params.id;
        let player = await Player.findOne({_id : id}).populate('stats').populate('playingStyle');
        return response.status(200).json({result : player});
    }
    catch(error){
        return response.status(500).json({error : "Internal server error"});
    }


}



export const signIn= async(request,response,next)=>{
try{
    let{email,password}=request.body;
    let player=await Player.findOne({email});
    return player ?
    bcrypt.compareSync(password,player.password)?response.status(200).json({message: "signin success",player :{...player.toObject(),password:undefined},token : generateToken(email)}):response.status(401).json({error:"Invalide request",message:"Invalide password"})
    :response.status(500).json({error:"Internal server error"});

}catch(err){
    console.log(err);
    return response.status(500).json({error:"internal server error"});
}
}
const generateToken=(email)=>{
    let payload={subject:email};
    return jwt.sign(payload,"hmaraapnaprojectcrickettournament");
}


//-----------------------------------------------------------------------------------------------------------------------------------------------------------------


export const signUp= async (request,response,next)=>{
    try {
        
    const error =validationResult(request);
    if(!error.isEmpty())
        return response.status(401).json({error:"Invalid request",errorMessage:error.array()});
    let password=request.body.password;
    let saltkey= bcrypt.genSaltSync(10);
    let enc= bcrypt.hashSync(password,saltkey);
    request.body.password=enc;
    let result = await Player.create(request.body);
    result=result.toObject();
    delete result.password;
    let email=request.body.email;
    sendEmail(email);
        return response.status(200).json({message:"signup success",player:result});
    } 
    catch (err) {
    console.log(err);
    return response.status(500).json({error:"Internal server error"});
    }
}

function sendEmail(email) {
    const mailOptions = {
        from: 'sb360879@gmail.com',
        to: email,
        subject: 'Sign-up Success Notification',
        text: 'Your sign-up was successful.'
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error occurred:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

//--------------------------------------------------------------

export const updateProfile=(request,response,next)=>{
let playerid=request.body._id;
console.log(playerid);
let fileName="";
if(request.file)
    fileName=request.file.filename;

Player.updateOne({_id:playerid},{
    $set:{image:fileName}
}).then(result=>{
        if(result.modifiedCount)
            return response.status(200).json({message:"profile update..."});
        console.log(result);
        return response.status(401).json({error: "Bad request (Id not found)"});  
    }).catch(err=>{
        return response.status(500).json({message: "Internal Server Error"});
    }); 
}

export const updatePlayerProfile = async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const updatedFields = req.body;

    
    const player = await Player.findByIdAndUpdate(playerId, updatedFields, { new: true });

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({ message: 'Player profile updated successfully', player });
  } catch (error) {
    console.error('Error updating player profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

