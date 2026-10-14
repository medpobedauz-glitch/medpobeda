import {Router} from 'express';
import {csrfProtection} from '../middleware/csrf.js';
import {recordQuestionAnswer} from '../services/question-answers.js';
const router=Router();
router.post('/questions/:id/answer',(req,res,next)=>{
 if(!req.student)return res.status(401).json({error:'Please sign in to answer questions.'});next();
},csrfProtection,(req,res)=>res.json(recordQuestionAnswer(req.params.id,req.student.id,req.body)));
router.use((error,req,res,next)=>error.answerSafe?res.status(error.status||400).json({error:error.message}):next(error));
export default router;
