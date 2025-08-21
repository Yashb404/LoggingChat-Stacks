(define-map user-log-count principal uint)

(define-map logs
  { user: principal, id: uint }
  {
    prompt-hash: (buff 32),
    response-hash: (buff 32),
    block-timestamp: uint
  }
)

(define-public (log-interaction (prompt-hash (buff 32)) (response-hash (buff 32)))
  (begin
    (let ((user tx-sender))
      (let ((new-log-id (default-to u0 (map-get? user-log-count user))))
        (map-set logs
          { user: user, id: new-log-id }
          {
            prompt-hash: prompt-hash,
            response-hash: response-hash,
            block-timestamp: stacks-block-height
          }
        )
        (map-set user-log-count user (+ new-log-id u1))
        (ok new-log-id)
      )
    )
  )
)

(define-read-only (get-user-log-count (user principal))
  (default-to u0 (map-get? user-log-count user))
)

(define-read-only (get-log (user principal) (id uint))
  (map-get? logs { user: user, id: id })
)


