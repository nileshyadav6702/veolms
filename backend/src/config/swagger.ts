import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VeoLMS API Documentation',
      version: '1.0.0',
      description:
        'Complete REST API documentation for the VeoLMS Learning Management System — covering Auth, Courses, Lessons, Payments, Enrollments, Progress, AI Chat, Notes, Reviews, Certificates, Uploads, and Admin management.',
      contact: {
        name: 'VeoLMS Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in an HTTP-only cookie (set automatically on login/signup)',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token (alternative to cookie auth)',
        },
      },
      schemas: {
        // ─── Auth ──────────────────────────────────────────────────────────────
        SignupRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['student', 'admin'], example: 'student' },
            aiProvider: { type: 'string', enum: ['openai', 'gemini'], example: 'gemini' },
            aiModel: { type: 'string', example: 'gemini-pro' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', example: 'sess_abc123' },
            userAgent: { type: 'string', example: 'Mozilla/5.0 ...' },
            ip: { type: 'string', example: '192.168.1.1' },
            createdAt: { type: 'string', format: 'date-time' },
            lastSeen: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Course ────────────────────────────────────────────────────────────
        Section: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Introduction' },
            order: { type: 'integer', example: 1 },
          },
        },
        CourseResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
            title: { type: 'string', example: 'Complete TypeScript Course' },
            slug: { type: 'string', example: 'complete-typescript-course' },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'uri' },
            price: { type: 'number', example: 1999 },
            isPublished: { type: 'boolean', example: true },
            sections: { type: 'array', items: { $ref: '#/components/schemas/Section' } },
            instructor: { type: 'string', example: 'John Doe' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CourseRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Complete TypeScript Course' },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'uri' },
            price: { type: 'number', example: 1999 },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        SectionRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Getting Started' },
            order: { type: 'integer', example: 1 },
          },
        },
        // ─── Lesson ────────────────────────────────────────────────────────────
        LessonResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Introduction to TypeScript' },
            courseId: { type: 'string' },
            sectionId: { type: 'string' },
            order: { type: 'integer', example: 1 },
            duration: { type: 'number', example: 600, description: 'Duration in seconds' },
            isFree: { type: 'boolean', example: false },
            hasSubtitles: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LessonRequest: {
          type: 'object',
          required: ['title', 'courseId', 'sectionId'],
          properties: {
            title: { type: 'string', example: 'Introduction to TypeScript' },
            courseId: { type: 'string' },
            sectionId: { type: 'string' },
            order: { type: 'integer', example: 1 },
            isFree: { type: 'boolean', example: false },
            videoKey: { type: 'string', description: 'S3 object key for the video file' },
          },
        },
        // ─── Payment ───────────────────────────────────────────────────────────
        CreateOrderRequest: {
          type: 'object',
          required: ['courseId'],
          properties: {
            courseId: { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
            couponCode: { type: 'string', example: 'SAVE50' },
          },
        },
        VerifyPaymentRequest: {
          type: 'object',
          required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
          properties: {
            razorpay_order_id: { type: 'string' },
            razorpay_payment_id: { type: 'string' },
            razorpay_signature: { type: 'string' },
            courseId: { type: 'string' },
          },
        },
        ApplyCouponRequest: {
          type: 'object',
          required: ['couponCode', 'courseId'],
          properties: {
            couponCode: { type: 'string', example: 'SAVE50' },
            courseId: { type: 'string' },
          },
        },
        // ─── Progress ──────────────────────────────────────────────────────────
        UpdateProgressRequest: {
          type: 'object',
          required: ['lessonId', 'courseId'],
          properties: {
            lessonId: { type: 'string' },
            courseId: { type: 'string' },
            watchedDuration: { type: 'number', example: 300, description: 'Seconds watched' },
            completed: { type: 'boolean', example: true },
          },
        },
        // ─── Note ──────────────────────────────────────────────────────────────
        SaveNoteRequest: {
          type: 'object',
          required: ['lessonId', 'courseId', 'content'],
          properties: {
            lessonId: { type: 'string' },
            courseId: { type: 'string' },
            content: { type: 'string', example: 'TypeScript has strict typing...' },
          },
        },
        NoteResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            lessonId: { type: 'string' },
            courseId: { type: 'string' },
            content: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Review ────────────────────────────────────────────────────────────
        ReviewRequest: {
          type: 'object',
          required: ['courseId', 'rating'],
          properties: {
            courseId: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Excellent course!' },
          },
        },
        ReviewResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            courseId: { type: 'string' },
            userId: { type: 'string' },
            rating: { type: 'integer' },
            comment: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Certificate ───────────────────────────────────────────────────────
        CertificateTemplateRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Certificate of Completion' },
            subtitle: { type: 'string', example: 'has successfully completed' },
            logoUrl: { type: 'string', format: 'uri' },
            signatoryName: { type: 'string', example: 'Jane Smith' },
            signatoryTitle: { type: 'string', example: 'Course Instructor' },
          },
        },
        CertificateResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            courseId: { type: 'string' },
            verificationCode: { type: 'string', example: 'CERT-ABC123' },
            issuedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── AI Chat ───────────────────────────────────────────────────────────
        CreateConversationRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Help with TypeScript generics' },
          },
        },
        SendMessageRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', example: 'Can you explain generics?' },
          },
        },
        // ─── Admin ─────────────────────────────────────────────────────────────
        CouponRequest: {
          type: 'object',
          required: ['code', 'discountType', 'discountValue'],
          properties: {
            code: { type: 'string', example: 'SAVE50' },
            discountType: { type: 'string', enum: ['flat', 'percentage'], example: 'percentage' },
            discountValue: { type: 'number', example: 50 },
            expiresAt: { type: 'string', format: 'date-time' },
            maxUses: { type: 'integer', example: 100 },
            applicableCourses: { type: 'array', items: { type: 'string' } },
          },
        },
        GrantAccessRequest: {
          type: 'object',
          required: ['courseId'],
          properties: {
            courseId: { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
          },
        },
        AiSettingsRequest: {
          type: 'object',
          properties: {
            aiProvider: { type: 'string', enum: ['openai', 'gemini'], example: 'gemini' },
            aiModel: { type: 'string', example: 'gemini-1.5-pro' },
            aiApiKey: { type: 'string', example: 'sk-...' },
          },
        },
        // ─── Generic ───────────────────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication — signup, login, logout, session management' },
      { name: 'Courses', description: 'Course CRUD, section management, publishing' },
      { name: 'Lessons', description: 'Lesson content, HLS streaming, subtitles, AI assistant' },
      { name: 'Payments', description: 'Razorpay order creation, verification, and webhooks' },
      { name: 'Enrollments', description: 'User course enrollments' },
      { name: 'Progress', description: 'Track lesson watch progress' },
      { name: 'Notes', description: 'Per-lesson notes for students' },
      { name: 'Reviews', description: 'Course ratings and reviews' },
      { name: 'Certificates', description: 'Course completion certificates' },
      { name: 'AI Chat', description: 'General-purpose AI conversation assistant' },
      { name: 'Upload', description: 'S3 presigned URLs, file deletion, and video transcoding' },
      { name: 'Admin', description: 'Admin dashboard, student management, coupon management' },
    ],
    paths: {
      // ════════════════════════════════════════════════════════════════════════
      // AUTH
      // ════════════════════════════════════════════════════════════════════════
      '/api/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
          },
          responses: {
            201: {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { user: { $ref: '#/components/schemas/UserResponse' } } },
                    ],
                  },
                },
              },
            },
            400: { description: 'Validation error or email already in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: {
              description: 'Login successful — JWT set in cookie',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { user: { $ref: '#/components/schemas/UserResponse' } } },
                    ],
                  },
                },
              },
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout current session',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'Logged out successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user profile',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'Current user data',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { user: { $ref: '#/components/schemas/UserResponse' } } },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/ai-settings': {
        put: {
          tags: ['Auth'],
          summary: 'Update personal AI provider settings',
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AiSettingsRequest' } } },
          },
          responses: {
            200: { description: 'AI settings updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/sessions': {
        get: {
          tags: ['Auth'],
          summary: 'List all active sessions for the current user',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'List of active sessions',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { sessions: { type: 'array', items: { $ref: '#/components/schemas/Session' } } } },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/sessions/{id}': {
        delete: {
          tags: ['Auth'],
          summary: 'Revoke a specific session by ID',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Session ID to revoke' }],
          responses: {
            200: { description: 'Session revoked', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Session not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // COURSES
      // ════════════════════════════════════════════════════════════════════════
      '/api/courses': {
        get: {
          tags: ['Courses'],
          summary: 'List all published courses',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Paginated list of courses',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      {
                        properties: {
                          courses: { type: 'array', items: { $ref: '#/components/schemas/CourseResponse' } },
                          total: { type: 'integer' },
                          page: { type: 'integer' },
                          pages: { type: 'integer' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Courses'],
          summary: 'Create a new course (Admin only)',
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CourseRequest' } } },
          },
          responses: {
            201: { description: 'Course created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { course: { $ref: '#/components/schemas/CourseResponse' } } }] } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            403: { description: 'Forbidden — Admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/courses/{slug}': {
        get: {
          tags: ['Courses'],
          summary: 'Get a course by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Course details', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { course: { $ref: '#/components/schemas/CourseResponse' } } }] } } } },
            404: { description: 'Course not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/courses/{id}': {
        put: {
          tags: ['Courses'],
          summary: 'Update a course (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CourseRequest' } } } },
          responses: {
            200: { description: 'Course updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Course not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        delete: {
          tags: ['Courses'],
          summary: 'Delete a course (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Course deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Course not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/courses/{id}/publish': {
        patch: {
          tags: ['Courses'],
          summary: 'Toggle publish status of a course (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Publish status toggled', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/courses/{id}/sections': {
        post: {
          tags: ['Courses'],
          summary: 'Add a section to a course (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SectionRequest' } } } },
          responses: {
            201: { description: 'Section added', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/courses/{id}/sections/{sectionId}': {
        put: {
          tags: ['Courses'],
          summary: 'Update a section (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SectionRequest' } } } },
          responses: {
            200: { description: 'Section updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Courses'],
          summary: 'Delete a section (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Section deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // LESSONS
      // ════════════════════════════════════════════════════════════════════════
      '/api/lessons/course/{courseId}': {
        get: {
          tags: ['Lessons'],
          summary: 'Get all lessons for a course (optional auth — unlocks full data for enrolled users)',
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          security: [{ cookieAuth: [] }, {}],
          responses: {
            200: { description: 'List of lessons', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { lessons: { type: 'array', items: { $ref: '#/components/schemas/LessonResponse' } } } }] } } } },
          },
        },
      },
      '/api/lessons/{id}/stream': {
        get: {
          tags: ['Lessons'],
          summary: 'Get a presigned video stream URL for a lesson',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Presigned stream URL', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { url: { type: 'string', format: 'uri' } } }] } } } },
            403: { description: 'Not enrolled', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/lessons/{id}/hls/{path}': {
        get: {
          tags: ['Lessons'],
          summary: 'Proxy HLS manifest / segment for a lesson (wildcard path)',
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'path', in: 'path', required: true, schema: { type: 'string' }, description: 'HLS file path (e.g. master.m3u8, 720p/seg0.ts)' },
          ],
          responses: {
            200: { description: 'HLS file content' },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/lessons/{id}/subtitles/{lang}': {
        get: {
          tags: ['Lessons'],
          summary: 'Get subtitle file for a lesson',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'path', required: true, schema: { type: 'string', example: 'en' } },
          ],
          responses: {
            200: { description: 'Subtitle content (VTT/SRT)' },
            404: { description: 'Subtitle not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/lessons/{id}/chat': {
        get: {
          tags: ['Lessons'],
          summary: 'Get AI chat history for a lesson',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Chat history', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        post: {
          tags: ['Lessons'],
          summary: 'Send a message to the lesson AI assistant',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendMessageRequest' } } } },
          responses: {
            200: { description: 'AI response', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/lessons': {
        post: {
          tags: ['Lessons'],
          summary: 'Create a lesson (Admin only)',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LessonRequest' } } } },
          responses: {
            201: { description: 'Lesson created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { lesson: { $ref: '#/components/schemas/LessonResponse' } } }] } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/lessons/{id}': {
        put: {
          tags: ['Lessons'],
          summary: 'Update a lesson (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LessonRequest' } } } },
          responses: {
            200: { description: 'Lesson updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Lessons'],
          summary: 'Delete a lesson (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Lesson deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // PAYMENTS
      // ════════════════════════════════════════════════════════════════════════
      '/api/payments/create-order': {
        post: {
          tags: ['Payments'],
          summary: 'Create a Razorpay payment order',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderRequest' } } } },
          responses: {
            200: {
              description: 'Razorpay order details',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { order: { type: 'object', properties: { id: { type: 'string' }, amount: { type: 'integer' }, currency: { type: 'string', example: 'INR' } } } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/payments/verify': {
        post: {
          tags: ['Payments'],
          summary: 'Verify Razorpay payment signature after checkout',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyPaymentRequest' } } } },
          responses: {
            200: { description: 'Payment verified and enrollment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Invalid signature', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/payments/apply-coupon': {
        post: {
          tags: ['Payments'],
          summary: 'Validate and apply a coupon code',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplyCouponRequest' } } } },
          responses: {
            200: { description: 'Coupon valid — returns discounted price', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { discountedPrice: { type: 'number' } } }] } } } },
            400: { description: 'Invalid or expired coupon', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['Payments'],
          summary: 'Razorpay webhook (signature-verified, no JWT needed)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            200: { description: 'Webhook processed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // ENROLLMENTS
      // ════════════════════════════════════════════════════════════════════════
      '/api/enrollments': {
        get: {
          tags: ['Enrollments'],
          summary: 'Get all enrollments for the current user',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'List of enrolled courses',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      { properties: { enrollments: { type: 'array', items: { type: 'object' } } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/enrollments/{courseId}': {
        get: {
          tags: ['Enrollments'],
          summary: 'Check enrollment status for a specific course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Enrollment status', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { isEnrolled: { type: 'boolean' } } }] } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // PROGRESS
      // ════════════════════════════════════════════════════════════════════════
      '/api/progress': {
        post: {
          tags: ['Progress'],
          summary: 'Update lesson watch progress',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProgressRequest' } } } },
          responses: {
            200: { description: 'Progress updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/progress/recent': {
        get: {
          tags: ['Progress'],
          summary: 'Get recently watched lessons across all courses',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'Recent progress list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/progress/course/{courseId}': {
        get: {
          tags: ['Progress'],
          summary: 'Get detailed progress for a specific course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Course progress data', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // NOTES
      // ════════════════════════════════════════════════════════════════════════
      '/api/notes': {
        post: {
          tags: ['Notes'],
          summary: 'Create or update a note for a lesson',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SaveNoteRequest' } } } },
          responses: {
            200: { description: 'Note saved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { note: { $ref: '#/components/schemas/NoteResponse' } } }] } } } },
          },
        },
      },
      '/api/notes/all': {
        get: {
          tags: ['Notes'],
          summary: 'Get all notes for the current user across all courses',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'All notes', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { notes: { type: 'array', items: { $ref: '#/components/schemas/NoteResponse' } } } }] } } } },
          },
        },
      },
      '/api/notes/lesson/{lessonId}': {
        get: {
          tags: ['Notes'],
          summary: 'Get the note for a specific lesson',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'lessonId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Note for lesson', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { note: { $ref: '#/components/schemas/NoteResponse' } } }] } } } },
          },
        },
      },
      '/api/notes/course/{courseId}': {
        get: {
          tags: ['Notes'],
          summary: 'Get all notes for a specific course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Notes for course', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { notes: { type: 'array', items: { $ref: '#/components/schemas/NoteResponse' } } } }] } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // REVIEWS
      // ════════════════════════════════════════════════════════════════════════
      '/api/reviews': {
        get: {
          tags: ['Reviews'],
          summary: 'List reviews (supports ?courseId= filter)',
          parameters: [
            { name: 'courseId', in: 'query', schema: { type: 'string' }, description: 'Filter reviews by course' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            200: { description: 'List of reviews', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { reviews: { type: 'array', items: { $ref: '#/components/schemas/ReviewResponse' } } } }] } } } },
          },
        },
        post: {
          tags: ['Reviews'],
          summary: 'Create or update a course review',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewRequest' } } } },
          responses: {
            200: { description: 'Review saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Not enrolled or not eligible to review', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/reviews/{id}': {
        delete: {
          tags: ['Reviews'],
          summary: 'Delete a review',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Review deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/reviews/can-review/{courseId}': {
        get: {
          tags: ['Reviews'],
          summary: 'Check if current user can review a course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Eligibility status', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { canReview: { type: 'boolean' } } }] } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // CERTIFICATES
      // ════════════════════════════════════════════════════════════════════════
      '/api/certificates/verify/{code}': {
        get: {
          tags: ['Certificates'],
          summary: 'Publicly verify a certificate by its verification code',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' }, description: 'Certificate verification code' }],
          responses: {
            200: { description: 'Certificate valid', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { certificate: { $ref: '#/components/schemas/CertificateResponse' } } }] } } } },
            404: { description: 'Certificate not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/certificates/my': {
        get: {
          tags: ['Certificates'],
          summary: 'List all certificates earned by the current user',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'User certificates', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { certificates: { type: 'array', items: { $ref: '#/components/schemas/CertificateResponse' } } } }] } } } },
          },
        },
      },
      '/api/certificates/course/{courseId}/template': {
        get: {
          tags: ['Certificates'],
          summary: 'Get the certificate template for a course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Certificate template', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        put: {
          tags: ['Certificates'],
          summary: 'Update the certificate template for a course (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CertificateTemplateRequest' } } } },
          responses: {
            200: { description: 'Template updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/certificates/course/{courseId}/my': {
        get: {
          tags: ['Certificates'],
          summary: "Get the current user's certificate for a course",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Certificate details', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { certificate: { $ref: '#/components/schemas/CertificateResponse' } } }] } } } },
            404: { description: 'Certificate not yet claimed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/certificates/course/{courseId}/claim': {
        post: {
          tags: ['Certificates'],
          summary: 'Claim a certificate after completing a course',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            201: { description: 'Certificate issued', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { certificate: { $ref: '#/components/schemas/CertificateResponse' } } }] } } } },
            400: { description: 'Course not completed or already claimed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // AI CHAT
      // ════════════════════════════════════════════════════════════════════════
      '/api/ai-chats': {
        post: {
          tags: ['AI Chat'],
          summary: 'Create a new AI conversation',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConversationRequest' } } } },
          responses: {
            201: { description: 'Conversation created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        get: {
          tags: ['AI Chat'],
          summary: 'List all AI conversations for the current user',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'Conversations list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/ai-chats/{id}/messages': {
        get: {
          tags: ['AI Chat'],
          summary: 'Get all messages in a conversation',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Messages in conversation', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        post: {
          tags: ['AI Chat'],
          summary: 'Send a message in a conversation',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendMessageRequest' } } } },
          responses: {
            200: { description: 'AI response message', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/ai-chats/{id}': {
        delete: {
          tags: ['AI Chat'],
          summary: 'Delete an AI conversation',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Conversation deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // UPLOAD
      // ════════════════════════════════════════════════════════════════════════
      '/api/upload/file': {
        get: {
          tags: ['Upload'],
          summary: 'Get a presigned URL for reading a private file from S3',
          parameters: [{ name: 'key', in: 'query', required: true, schema: { type: 'string' }, description: 'S3 object key' }],
          responses: {
            200: { description: 'Presigned URL', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { url: { type: 'string' } } }] } } } },
          },
        },
      },
      '/api/upload/image': {
        get: {
          tags: ['Upload'],
          summary: 'Get a presigned URL for reading an image from S3',
          parameters: [{ name: 'key', in: 'query', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Presigned image URL', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { url: { type: 'string' } } }] } } } },
          },
        },
      },
      '/api/upload/thumbnail': {
        post: {
          tags: ['Upload'],
          summary: 'Get a presigned URL to upload a course thumbnail (Admin only)',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { fileName: { type: 'string' }, fileType: { type: 'string', example: 'image/jpeg' } } } } } },
          responses: {
            200: { description: 'Presigned upload URL', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { uploadUrl: { type: 'string' }, key: { type: 'string' } } }] } } } },
          },
        },
      },
      '/api/upload/video': {
        post: {
          tags: ['Upload'],
          summary: 'Get a presigned URL to upload a lesson video (Admin only)',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { fileName: { type: 'string' }, fileType: { type: 'string', example: 'video/mp4' } } } } } },
          responses: {
            200: { description: 'Presigned upload URL', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { uploadUrl: { type: 'string' }, key: { type: 'string' } } }] } } } },
          },
        },
      },
      '/api/upload/delete-file': {
        post: {
          tags: ['Upload'],
          summary: 'Delete a file from S3 (Admin only)',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['key'], properties: { key: { type: 'string' } } } } } },
          responses: {
            200: { description: 'File deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/upload/transcode/{lessonId}': {
        post: {
          tags: ['Upload'],
          summary: 'Trigger video transcoding for a lesson (Admin only)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'lessonId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Transcoding job triggered', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/upload/transcode-callback': {
        post: {
          tags: ['Upload'],
          summary: 'Callback from the transcoder worker to update video key (internal — secret-verified)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            200: { description: 'Video key updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      // ADMIN
      // ════════════════════════════════════════════════════════════════════════
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'Get admin dashboard statistics',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard stats',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessResponse' },
                      {
                        properties: {
                          totalStudents: { type: 'integer' },
                          totalCourses: { type: 'integer' },
                          totalRevenue: { type: 'number' },
                          totalEnrollments: { type: 'integer' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/students': {
        get: {
          tags: ['Admin'],
          summary: 'List all students with optional search/pagination',
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Students list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/students/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'Get detailed information about a specific student',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Student details', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            404: { description: 'Student not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        delete: {
          tags: ['Admin'],
          summary: 'Delete a student account',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Student deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/students/{id}/courses': {
        post: {
          tags: ['Admin'],
          summary: 'Manually grant course access to a student',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GrantAccessRequest' } } } },
          responses: {
            200: { description: 'Access granted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/students/{id}/courses/{courseId}': {
        delete: {
          tags: ['Admin'],
          summary: "Revoke a student's access to a course",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'courseId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Access revoked', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/students/{id}/sessions/{sessionId}': {
        delete: {
          tags: ['Admin'],
          summary: "Revoke a specific session for a student",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Session revoked', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/enrollments': {
        get: {
          tags: ['Admin'],
          summary: 'Get all enrollments across the platform',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'All enrollments', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/courses': {
        get: {
          tags: ['Admin'],
          summary: 'Get all courses (including unpublished) for admin view',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'All courses', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/coupons': {
        post: {
          tags: ['Admin'],
          summary: 'Create a new coupon',
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponRequest' } } } },
          responses: {
            201: { description: 'Coupon created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        get: {
          tags: ['Admin'],
          summary: 'List all coupons',
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'Coupons list', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
      '/api/admin/coupons/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'Get a coupon by ID',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Coupon details', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        put: {
          tags: ['Admin'],
          summary: 'Update a coupon',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponRequest' } } } },
          responses: {
            200: { description: 'Coupon updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
        delete: {
          tags: ['Admin'],
          summary: 'Delete a coupon',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Coupon deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          },
        },
      },
    },
  },
  apis: [], // All definitions are inline above
};

export const swaggerSpec = swaggerJsdoc(options);
