export default function ProgressBar({ current,total }){
  const percent = (current/total)*100;
  return (
    <div>
      <div>{current}/{total} Letters Learned</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{width:percent+'%'}}></div>
      </div>
    </div>
  )
}