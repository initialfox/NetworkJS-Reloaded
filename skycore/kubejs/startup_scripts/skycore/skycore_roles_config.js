// SkyCore — конфиг прав ролей (startup_scripts, загружается ДО server_scripts)
// Server scripts читают global.SkyCoreRolesConfig (без присваивания в server)

global.SkyCoreRolesConfig = {
  admin: {
    description: 'Администратор — полный доступ',
    permissions: [
      'permissions.*',
      'homes.set',
      'homes.teleport',
      'homes.list',
      'homes.delete',
      'homes.*',
      'blocks.*',
      'regions.*',
      'spawn.*'
    ]
  },
  moderator: {
    description: 'Модератор',
    permissions: [
      'permissions.list',
      'permissions.info',
      'permissions.set',
      'homes.set',
      'homes.teleport',
      'homes.list',
      'homes.delete',
      'homes.*',
      'blocks.*',
      'regions.*',
      'spawn.set',
      'spawn.use'
    ]
  },
  vip: {
    description: 'VIP',
    permissions: [
      'homes.set',
      'homes.teleport',
      'homes.list',
      'homes.delete',
      'homes.*',
      'blocks.break',
      'blocks.place',
      'blocks.interact',
      'regions.create',
      'regions.info',
      'regions.manage',
      'regions.list',
      'regions.delete',
      'spawn.use'
    ]
  },
  user: {
    description: 'Игрок',
    permissions: [
      'homes.set',
      'homes.teleport',
      'homes.list',
      'homes.delete',
      'homes.*',
      'blocks.break',
      'blocks.place',
      'blocks.interact',
      'regions.create',
      'regions.info',
      'regions.manage',
      'regions.list',
      'regions.delete',
      'spawn.use'
    ]
  }
}

console.info('[SkyCore] SkyCoreRolesConfig loaded (startup)')
