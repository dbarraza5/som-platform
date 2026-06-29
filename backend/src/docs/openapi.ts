// OpenAPI 3.1 specification for SOM Platform API.
// To add a new endpoint: add its path entry to `paths` and any new schemas to `components.schemas`.

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  required: ['success', 'message'],
}

const responses = {
  Unauthorized: {
    description: 'Token ausente, inválido o expirado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Unauthorized' },
      },
    },
  },
  Forbidden: {
    description: 'El usuario no tiene permisos sobre este recurso',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Access denied' },
      },
    },
  },
  NotFound: {
    description: 'Recurso no encontrado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Resource not found' },
      },
    },
  },
  ValidationError: {
    description: 'Error de validación en el body',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'name', message: 'name must be at least 3 characters' }],
        },
      },
    },
  },
}

const schemas = {
  ErrorResponse: errorResponse,

  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'object' },
      message: { type: 'string' },
    },
    required: ['success', 'data'],
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cm1abc' },
      nombre: { type: 'string', example: 'Juan Pérez' },
      email: { type: 'string', format: 'email', example: 'juan@example.com' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'nombre', 'email', 'createdAt', 'updatedAt'],
  },

  Tokens: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', description: 'JWT de acceso. TTL: 15 minutos.' },
      refreshToken: { type: 'string', description: 'JWT de refresco. TTL: 7 días.' },
    },
    required: ['accessToken', 'refreshToken'],
  },

  Project: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cm1abc' },
      name: { type: 'string', example: 'Análisis de Clientes' },
      description: { type: ['string', 'null'], example: 'Segmentación con SOM' },
      userId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'description', 'userId', 'createdAt', 'updatedAt'],
  },

  Dataset: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cm1xyz' },
      projectId: { type: 'string' },
      name: { type: 'string', example: 'Clientes 2025' },
      description: { type: ['string', 'null'] },
      originalFilename: { type: ['string', 'null'], example: 'clientes_2025.csv' },
      storageKey: {
        type: ['string', 'null'],
        example: 'projects/cm1abc/datasets/cm1xyz/original.csv',
      },
      mimeType: { type: ['string', 'null'], example: 'text/csv' },
      fileSize: { type: ['integer', 'null'], example: 204800 },
      rows: { type: ['integer', 'null'], example: null },
      columns: { type: ['integer', 'null'], example: null },
      uploadedAt: { type: ['string', 'null'], format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'projectId', 'name', 'description', 'originalFilename', 'storageKey',
      'mimeType', 'fileSize', 'rows', 'columns', 'uploadedAt', 'createdAt', 'updatedAt'],
  },

  RegisterBody: {
    type: 'object',
    properties: {
      nombre: { type: 'string', minLength: 1, example: 'Juan Pérez' },
      email: { type: 'string', format: 'email', example: 'juan@example.com' },
      password: { type: 'string', minLength: 8, example: 'secretpass' },
    },
    required: ['nombre', 'email', 'password'],
  },

  LoginBody: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', example: 'juan@example.com' },
      password: { type: 'string', example: 'secretpass' },
    },
    required: ['email', 'password'],
  },

  RefreshTokenBody: {
    type: 'object',
    properties: {
      refreshToken: { type: 'string' },
    },
    required: ['refreshToken'],
  },

  CreateProjectBody: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, example: 'Análisis de Clientes' },
      description: { type: 'string', example: 'Segmentación de clientes con redes SOM' },
    },
    required: ['name'],
  },

  UpdateProjectBody: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, example: 'Análisis de Clientes v2' },
      description: { type: 'string', example: 'Descripción actualizada' },
    },
  },

  CreateDatasetBody: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, example: 'Clientes 2025' },
      description: { type: 'string', example: 'Dataset inicial de clientes' },
    },
    required: ['name'],
  },

  UpdateDatasetBody: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, example: 'Clientes 2025 v2' },
      description: { type: 'string', example: 'Descripción actualizada' },
    },
  },
}

const auth = {
  '/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Registrar usuario',
      description: 'Crea una nueva cuenta de usuario. No requiere autenticación.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Usuario registrado correctamente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: {
                  user: { id: 'cm1abc', nombre: 'Juan Pérez', email: 'juan@example.com', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                },
                message: 'User registered successfully',
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '409': {
          description: 'El email ya está registrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Email already registered' },
            },
          },
        },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Iniciar sesión',
      description: 'Autentica al usuario y retorna un par de tokens JWT (access + refresh). No requiere autenticación.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Login exitoso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: {
                  accessToken: 'eyJhbGci...',
                  refreshToken: 'eyJhbGci...',
                  user: { id: 'cm1abc', nombre: 'Juan Pérez', email: 'juan@example.com' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': {
          description: 'Credenciales inválidas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Invalid email or password' },
            },
          },
        },
      },
    },
  },

  '/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Renovar access token',
      description: 'Emite un nuevo par de tokens usando el refresh token. El token anterior queda revocado (rotación). No requiere autenticación.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Tokens renovados',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: { accessToken: 'eyJhbGci...', refreshToken: 'eyJhbGci...' },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': {
          description: 'Refresh token inválido o expirado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Invalid or expired refresh token' },
            },
          },
        },
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Cerrar sesión',
      description: 'Revoca el refresh token en la base de datos. El access token expira por su TTL.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Sesión cerrada',
          content: {
            'application/json': {
              example: { success: true, data: null, message: 'Logged out successfully' },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Usuario actual',
      description: 'Retorna los datos del usuario autenticado.',
      responses: {
        '200': {
          description: 'Datos del usuario',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: {
                  user: { id: 'cm1abc', nombre: 'Juan Pérez', email: 'juan@example.com', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
}

const projects = {
  '/projects': {
    get: {
      tags: ['Projects'],
      summary: 'Listar proyectos',
      description: 'Retorna todos los proyectos del usuario autenticado, ordenados por fecha de creación descendente.',
      responses: {
        '200': {
          description: 'Lista de proyectos',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  projects: [
                    { id: 'cm1abc', name: 'Análisis de Clientes', description: 'Segmentación con SOM', userId: 'cm1usr', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                  ],
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Crear proyecto',
      description: 'Crea un proyecto asociado al usuario autenticado.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateProjectBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Proyecto creado',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  project: { id: 'cm1abc', name: 'Análisis de Clientes', description: 'Segmentación con SOM', userId: 'cm1usr', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/projects/{id}': {
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del proyecto (cuid)' },
    ],
    get: {
      tags: ['Projects'],
      summary: 'Obtener proyecto',
      description: 'Retorna el detalle de un proyecto. Solo el propietario puede acceder.',
      responses: {
        '200': {
          description: 'Detalle del proyecto',
          content: {
            'application/json': {
              example: { success: true, data: { project: { id: 'cm1abc', name: 'Análisis de Clientes', description: null, userId: 'cm1usr', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } } },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Projects'],
      summary: 'Actualizar proyecto',
      description: 'Modifica el nombre y/o descripción de un proyecto. Solo el propietario puede actualizarlo.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Proyecto actualizado',
          content: {
            'application/json': {
              example: { success: true, data: { project: { id: 'cm1abc', name: 'Análisis de Clientes v2', description: 'Descripción actualizada', userId: 'cm1usr', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T01:00:00.000Z' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Eliminar proyecto',
      description: 'Elimina permanentemente un proyecto. Solo el propietario puede eliminarlo.',
      responses: {
        '200': {
          description: 'Proyecto eliminado',
          content: {
            'application/json': {
              example: { success: true, data: null, message: 'Project deleted successfully' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}

const datasets = {
  '/projects/{projectId}/datasets': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del proyecto (cuid)' },
    ],
    get: {
      tags: ['Datasets'],
      summary: 'Listar datasets de un proyecto',
      description: 'Retorna todos los datasets del proyecto, ordenados por fecha de creación descendente.',
      responses: {
        '200': {
          description: 'Lista de datasets',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  datasets: [
                    { id: 'cm1xyz', projectId: 'cm1abc', name: 'Clientes 2025', description: null, originalFilename: null, storageKey: null, mimeType: null, fileSize: null, rows: null, columns: null, uploadedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                  ],
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { description: 'Proyecto no encontrado', content: { 'application/json': { example: { success: false, message: 'Project not found' } } } },
      },
    },
    post: {
      tags: ['Datasets'],
      summary: 'Crear dataset',
      description: 'Crea un dataset lógico asociado al proyecto. El archivo CSV se sube en un paso separado con `POST /datasets/{id}/upload`.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateDatasetBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Dataset creado',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  dataset: { id: 'cm1xyz', projectId: 'cm1abc', name: 'Clientes 2025', description: 'Dataset inicial', originalFilename: null, storageKey: null, mimeType: null, fileSize: null, rows: null, columns: null, uploadedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { description: 'Proyecto no encontrado', content: { 'application/json': { example: { success: false, message: 'Project not found' } } } },
      },
    },
  },

  '/datasets/{id}': {
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del dataset (cuid)' },
    ],
    get: {
      tags: ['Datasets'],
      summary: 'Obtener dataset',
      description: 'Retorna el detalle completo de un dataset incluyendo los metadatos del archivo si ha sido subido.',
      responses: {
        '200': {
          description: 'Detalle del dataset',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: {
                  dataset: { id: 'cm1xyz', projectId: 'cm1abc', name: 'Clientes 2025', description: null, originalFilename: 'clientes.csv', storageKey: 'projects/cm1abc/datasets/cm1xyz/original.csv', mimeType: 'text/csv', fileSize: 204800, rows: null, columns: null, uploadedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', project: { id: 'cm1abc', name: 'Análisis de Clientes' } },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Datasets'],
      summary: 'Actualizar dataset',
      description: 'Modifica el nombre y/o descripción del dataset. No afecta al archivo subido.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateDatasetBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Dataset actualizado',
          content: {
            'application/json': {
              example: { success: true, data: { dataset: { id: 'cm1xyz', name: 'Clientes 2025 v2', description: 'Descripción actualizada', updatedAt: '2026-01-01T01:00:00.000Z' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Datasets'],
      summary: 'Eliminar dataset',
      description: 'Elimina el dataset y su registro en la base de datos.',
      responses: {
        '200': {
          description: 'Dataset eliminado',
          content: {
            'application/json': {
              example: { success: true, data: null, message: 'Dataset deleted successfully' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/datasets/{id}/upload': {
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del dataset (cuid)' },
    ],
    post: {
      tags: ['Datasets'],
      summary: 'Subir archivo CSV',
      description: 'Sube un archivo CSV al dataset. Si ya existía un archivo, el anterior se elimina y es reemplazado. La clave de almacenamiento sigue el patrón `projects/{projectId}/datasets/{id}/original.csv`.',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Archivo CSV. Extensión `.csv`, MIME type `text/csv`. Máximo 10 MB.',
                },
              },
              required: ['file'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Archivo subido correctamente. Los metadatos del dataset se actualizan.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                data: {
                  dataset: { id: 'cm1xyz', projectId: 'cm1abc', name: 'Clientes 2025', description: null, originalFilename: 'clientes_2025.csv', storageKey: 'projects/cm1abc/datasets/cm1xyz/original.csv', mimeType: 'text/csv', fileSize: 204800, rows: null, columns: null, uploadedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Archivo no válido o tamaño excedido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                noFile: { summary: 'Sin archivo', value: { success: false, message: 'No file provided' } },
                invalidType: { summary: 'Tipo inválido', value: { success: false, message: 'Only CSV files are allowed' } },
                tooLarge: { summary: 'Tamaño excedido', value: { success: false, message: 'File exceeds the maximum allowed size' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'SOM Platform API',
    description: 'REST API para la plataforma de entrenamiento y visualización de mapas autoorganizados (Self-Organizing Maps).',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Entorno de desarrollo',
    },
  ],
  // Applied globally; override per-endpoint with security: [] for public routes
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Authentication', description: 'Registro, login, renovación de tokens y logout' },
    { name: 'Projects', description: 'Gestión de proyectos del usuario autenticado' },
    { name: 'Datasets', description: 'Gestión de datasets y upload de archivos CSV' },
    { name: 'Training Jobs', description: 'Entrenamientos SOM — disponible en fases futuras' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT de acceso obtenido en /auth/login o /auth/refresh. TTL: 15 minutos.',
      },
    },
    schemas,
    responses,
  },
  paths: {
    ...auth,
    ...projects,
    ...datasets,
  },
}
