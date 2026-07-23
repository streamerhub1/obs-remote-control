import React from 'react';
import { Tv, Activity, PlaySquare, Square, Video, Layers, Eye, EyeOff, Mic, Volume2, VolumeX } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ObsDataSource } from './data-sources';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ObsDashboard({ dataSource }: { dataSource: ObsDataSource }) {
  const [snapshot, setSnapshot] = React.useState<any>(null);
  const [obsState, setObsState] = React.useState<string>('disconnected');

  React.useEffect(() => {
    let cleanup = dataSource.subscribe((event) => {
      if (event.state) setObsState(event.state);
      if (event.snapshot) setSnapshot(event.snapshot);
      if (event.event && snapshot) {
        // Simple patch logic for remote events. Real app requires strict patching.
        // Or if it's full snapshot:
        if (event.event.type === 'snapshot') setSnapshot(event.event.payload);
      }
    });

    if (dataSource.type === 'local') {
      dataSource.getSnapshot().then(setSnapshot).catch(() => {});
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  const execute = (cmd: any) => dataSource.execute(cmd);

  if (obsState !== 'connected' || !snapshot) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Ожидание состояния OBS...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
         <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
           <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Версия</h4>
           <p className="font-medium text-sm">{snapshot.obsVersion} / WS {snapshot.websocketVersion}</p>
         </div>
         <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
           <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide flex justify-between">
              Трансляция
              {snapshot.streamStatus?.active ? <PlaySquare size={14} className="text-red-400"/> : <Square size={14} />}
           </h4>
           <p className={cn("font-medium", snapshot.streamStatus?.active ? "text-red-400" : "text-gray-300")}>
             {snapshot.streamStatus?.active ? `В эфире: ${snapshot.streamStatus.timecode}` : 'Остановлена'}
           </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Сцены */}
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Video size={20} className="text-blue-400"/> Сцены</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {snapshot.scenes?.length > 0 ? snapshot.scenes.map((sceneName: string) => {
              const isActive = sceneName === snapshot.currentProgramScene;
              return (
                <button
                  key={sceneName}
                  onClick={() => execute({ type: 'scene.setCurrentProgram', payload: { sceneName } })}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg text-sm font-medium border transition-all text-left truncate",
                    isActive ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-black border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                  )}
                >
                  {sceneName}
                </button>
              )
            }) : <p className="text-sm text-gray-500 text-center mt-10">Сцены не найдены</p>}
          </div>
        </div>

        {/* Источники */}
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Layers size={20} className="text-purple-400"/> Источники ({snapshot.currentProgramScene})</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {snapshot.sceneItems?.[snapshot.currentProgramScene]?.length > 0 ? 
              snapshot.sceneItems[snapshot.currentProgramScene].map((item: any) => (
                <div key={item.sceneItemId} className="flex items-center justify-between p-3 bg-black border border-gray-800 rounded-lg">
                  <span className="text-sm truncate mr-2">{item.sourceName}</span>
                  <button 
                    onClick={() => execute({ type: 'sceneItem.setEnabled', payload: { sceneName: snapshot.currentProgramScene, sceneItemId: item.sceneItemId, enabled: !item.sceneItemEnabled }})}
                    className={cn("p-1.5 rounded-md hover:bg-gray-800 transition-colors", item.sceneItemEnabled ? "text-gray-300" : "text-gray-600")}
                  >
                    {item.sceneItemEnabled ? <Eye size={16}/> : <EyeOff size={16}/>}
                  </button>
                </div>
              ))
            : <p className="text-sm text-gray-500 text-center mt-10">Нет источников</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
