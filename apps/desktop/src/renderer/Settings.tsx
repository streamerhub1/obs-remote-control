import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@obs-remote/ui';

export function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h2 className="text-3xl font-semibold text-gray-100">Настройки</h2>
        <p className="text-gray-400 mt-2">
          Управление вашим аккаунтом и приложением.
        </p>
      </header>

      <div className="space-y-6">
        <Card className="bg-[#161616] border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Внешний вид</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-200">Тема оформления</p>
                <p className="text-sm text-gray-400">
                  Выберите светлую или темную тему
                </p>
              </div>
              <select className="bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="dark">Темная</option>
                <option value="light">Светлая</option>
                <option value="system">Системная</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161616] border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Уведомления</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-200">Push-уведомления</p>
                <p className="text-sm text-gray-400">
                  Получать уведомления на рабочем столе
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-black/50"
                defaultChecked
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161616] border-red-900/30">
          <CardHeader>
            <CardTitle className="text-xl text-red-400">Опасная зона</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-200">Удаление аккаунта</p>
                <p className="text-sm text-gray-400">
                  Это действие необратимо удалит все ваши данные
                </p>
              </div>
              <Button variant="danger">Удалить аккаунт</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161616] border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">О приложении (About)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Название:</span>
                <span className="font-medium">
                  Streamly (StreamerHub Desktop)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Версия:</span>
                <span className="font-medium">v1.0.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Сборка (Commit SHA):</span>
                <span className="font-mono text-purple-400">latest</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Дата сборки:</span>
                <span className="font-medium">Недавно</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Окружение:</span>
                <span className="font-medium">
                  {import.meta.env.MODE === 'development'
                    ? 'Development'
                    : 'Production'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
