<script>
import { nextTick } from "vue";
import cache from "../cache.ts";
import tools from "../tools.ts";
import rest from "../rest.ts";

/**
 * IssuesSearchInput - JQL-подобный поиск задач
 * 
 * Формат запросов:
 * - Проект = 'Основной проект'
 * - Статус != Решенные
 * - Проект = 'A' AND Статус != Решенные
 * - Создана > '2024-01-01' ORDER BY Создана DESC
 */
export default {
  props: {
    parent_query: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "label",
    },
    id: {
      type: String,
      default: "",
    },
    parent_name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "text",
    },
    fields: {
      type: Array,
      default: () => [],
    },
    projects: {
      type: Array,
      default: () => [],
    },
    issue_statuses: {
      type: Array,
      default: () => [],
    },
    issue_types: {
      type: Array,
      default: () => [],
    },
    users: {
      type: Array,
      default: () => [],
    },
    sprints: {
      type: Array,
      default: () => [],
    },
    tags: {
      type: Array,
      default: () => [],
    },
    suggestions_on_panel: {
      type: Number,
      default: 8,
    },
    searchOnParentUpdate: {
      type: Boolean,
      default: true,
    }
  },

  emits: ["update_parent_from_input", "input_focus", "search_issues", "converted"],
  
  data() {
    return {
      gpt_controller: null,
      suggestions: [],
      selected_suggestion_id: -1,
      suggestions_offset: 0,
      suggestions_visible_count: 8,
      is_in_focus: false,
      
      // Атрибуты задач (русские имена)
      attributes: [
        { name: "Автор", type: "User", field: "author_uuid" },
        { name: "Название", type: "String", field: "title" },
        { name: "Описание", type: "String", field: "description" },
        { name: "Тип", type: "Type", field: "type_uuid" },
        { name: "Создана", type: "Timestamp", field: "created_at" },
        { name: "Изменена", type: "Timestamp", field: "updated_at" },
        { name: "Проект", type: "Project", field: "project_uuid" },
        { name: "Статус", type: "Status", field: "status_uuid" },
        { name: "Спринт", type: "Sprint", field: "sprint_uuid" },
        { name: "Тэг", type: "Tag", field: "tags" },
      ],
      
      // Операторы по типам полей
      types_to_operations: {
        User: ["=", "!="],
        Numeric: ["=", "!=", "<", ">", "<=", ">="],
        Timestamp: ["=", "!=", "<", ">", "<=", ">="],
        String: ["=", "!=", "like"],
        Text: ["=", "!=", "like"],
        Sprint: ["=", "!="],
        Type: ["=", "!="],
        Project: ["=", "!="],
        Status: ["=", "!="],
        Tag: ["=", "!="],
        Select: ["=", "!="],
        Boolean: ["="],
        Time: ["=", "!=", "<", ">"]
      },
      
      // Все операторы для распознавания
      all_operators: ["=", "!=", "<", ">", "<=", ">=", "like", "LIKE"],
      
      // Логические операторы
      logic_operators: ["AND", "OR", "ORDER BY"],
      order_directions: ["DESC", "ASC"],
      
      value: "",
      highlighted_html: "",
      position: 0,
      current_field_type: null,
      current_field_name: null,
      select_values: [],
      resolved_name: "Решенные",
      gpt_pnts: '',
      gpt_loader_visible: false,
      has_errors: false,
      
      // Состояние парсера
      parse_state: 'field', // field, operator, value, logic
    };
  },
  
  computed: {
    // Словарь значений для полей-справочников
    vals_dict() {
      let v = {
        Type: this.issue_types,
        Project: this.projects,
        Status: [...this.issue_statuses, { uuid: "(resolved)", name: this.resolved_name }],
        User: this.users,
        Sprint: this.sprints,
        Tag: this.tags,
      };
      return v;
    },

    // Все поля (атрибуты + кастомные)
    all_fields() {
      const result = [];
      
      // Атрибуты
      for (const attr of this.attributes) {
        result.push({
          name: attr.name,
          type: attr.type,
          field: attr.field,
          isCustom: false
        });
      }
      
      // Кастомные поля
      for (const field of this.fields) {
        result.push({
          name: field.name,
          type: field.type?.[0]?.code || 'String',
          field: field.uuid,
          isCustom: true,
          available_values: field.available_values
        });
      }
      
      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
  },

  watch: {
    parent_query(val) {
      if (!this.searchOnParentUpdate) return;
      if (val != this.value) {
        this.value = val;
        this.updateInputContent();
        this.emit_query();
      }
    },
  },
  
  mounted() {
    this.value = this.parent_query;
    this.updateInputContent();
    setInterval(this.update_gpt_pnts, 500);
  },

  methods: {
    update_gpt_pnts() {
      if (this.gpt_pnts.length < 3) this.gpt_pnts += '.';
      else this.gpt_pnts = '.';
    },
    
    // Обновление содержимого input с подсветкой
    updateInputContent() {
      nextTick(() => {
        const input = this.$refs.issues_search_input;
        if (input) {
          const html = this.getHighlightedHtml();
          if (input.innerHTML !== html) {
            const pos = this.getCaretIndex(input);
            input.innerHTML = html;
            this.setCaretPosition(input, pos);
          }
        }
      });
    },
    
    // Генерация HTML с подсветкой синтаксиса
    getHighlightedHtml() {
      if (!this.value) return '';
      
      const tokens = this.tokenizeForHighlight(this.value);
      let html = '';
      
      // Проверяем валидность всего запроса
      const validation = this.validate_query(this.value);
      const hasError = !validation.valid;
      const errorFields = new Set();
      
      // Собираем поля с ошибками
      if (validation.errors) {
        for (const err of validation.errors) {
          if (err.field) errorFields.add(err.field.toLowerCase());
        }
      }
      
      for (const token of tokens) {
        let className = 'hl-text';
        
        if (token.type === 'field') {
          className = 'hl-field';
        } else if (token.type === 'operator') {
          className = 'hl-operator';
        } else if (token.type === 'value') {
          className = 'hl-value';
          // Проверяем есть ли ошибка для этого значения
          if (errorFields.size > 0) {
            // Находим связанное поле
            const tokenIdx = tokens.indexOf(token);
            for (let i = tokenIdx - 1; i >= 0; i--) {
              if (tokens[i].type === 'field') {
                if (errorFields.has(tokens[i].text.toLowerCase())) {
                  className = 'hl-error';
                }
                break;
              }
            }
          }
        } else if (token.type === 'logic') {
          className = 'hl-logic';
        } else if (token.type === 'paren') {
          className = 'hl-paren';
        } else if (token.type === 'string') {
          className = 'hl-string';
          // Проверяем ошибки для строковых значений
          if (errorFields.size > 0) {
            const tokenIdx = tokens.indexOf(token);
            for (let i = tokenIdx - 1; i >= 0; i--) {
              if (tokens[i].type === 'field') {
                if (errorFields.has(tokens[i].text.toLowerCase())) {
                  className = 'hl-error';
                }
                break;
              }
            }
          }
        } else if (token.type === 'space') {
          html += token.text.replace(/ /g, '&nbsp;');
          continue;
        } else if (token.type === 'unknown') {
          className = 'hl-error';
        }
        
        const escaped = token.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        html += `<span class="${className}">${escaped}</span>`;
      }
      
      this.has_errors = hasError;
      return html;
    },
    
    // Токенизация для подсветки
    tokenizeForHighlight(str) {
      const tokens = [];
      let i = 0;
      let expectNext = 'field'; // field, operator, value, logic
      
      while (i < str.length) {
        // Пробелы
        if (/\s/.test(str[i])) {
          let spaces = '';
          while (i < str.length && /\s/.test(str[i])) {
            spaces += str[i];
            i++;
          }
          tokens.push({ type: 'space', text: spaces });
          continue;
        }
        
        // Скобки
        if (str[i] === '(') {
          tokens.push({ type: 'paren', text: '(' });
          i++;
          expectNext = 'field';
          continue;
        }
        if (str[i] === ')') {
          tokens.push({ type: 'paren', text: ')' });
          i++;
          expectNext = 'logic';
          continue;
        }
        
        // Строка в кавычках
        if (str[i] === "'" || str[i] === '"') {
          const quote = str[i];
          let text = quote;
          i++;
          while (i < str.length && str[i] !== quote) {
            text += str[i];
            i++;
          }
          if (i < str.length) {
            text += str[i];
            i++;
          }
          tokens.push({ type: 'string', text });
          expectNext = 'logic';
          continue;
        }
        
        // Операторы (проверяем двухсимвольные сначала)
        const twoChar = str.substring(i, i + 2);
        if (['!=', '<=', '>='].includes(twoChar)) {
          tokens.push({ type: 'operator', text: twoChar });
          i += 2;
          expectNext = 'value';
          continue;
        }
        
        // Однсимвольные операторы
        if (['=', '<', '>'].includes(str[i])) {
          tokens.push({ type: 'operator', text: str[i] });
          i++;
          expectNext = 'value';
          continue;
        }
        
        // Слово (идентификатор)
        if (/[a-zA-Zа-яА-ЯёЁ0-9_-]/.test(str[i])) {
          let word = '';
          while (i < str.length && /[a-zA-Zа-яА-ЯёЁ0-9_-]/.test(str[i])) {
            word += str[i];
            i++;
          }
          
          const upperWord = word.toUpperCase();
          
          // Определяем тип токена
          if (['AND', 'OR', 'И', 'ИЛИ'].includes(upperWord)) {
            tokens.push({ type: 'logic', text: word });
            expectNext = 'field';
          } else if (upperWord === 'ORDER') {
            // ORDER BY
            let orderBy = word;
            // Ищем BY
            let j = i;
            while (j < str.length && /\s/.test(str[j])) j++;
            if (str.substring(j, j + 2).toUpperCase() === 'BY') {
              orderBy += str.substring(i, j + 2);
              i = j + 2;
            }
            tokens.push({ type: 'logic', text: orderBy });
            expectNext = 'field';
          } else if (['ASC', 'DESC'].includes(upperWord)) {
            tokens.push({ type: 'logic', text: word });
            expectNext = 'logic';
          } else if (['LIKE', 'NOT'].includes(upperWord)) {
            tokens.push({ type: 'operator', text: word });
            expectNext = 'value';
          } else if (this.is_field(word)) {
            tokens.push({ type: 'field', text: word });
            this.current_field_name = word;
            this.current_field_type = this.get_field_type(word);
            expectNext = 'operator';
          } else if (expectNext === 'value') {
            tokens.push({ type: 'value', text: word });
            expectNext = 'logic';
          } else {
            tokens.push({ type: 'unknown', text: word });
          }
          continue;
        }
        
        // Неизвестный символ
        tokens.push({ type: 'unknown', text: str[i] });
        i++;
      }
      
      return tokens;
    },
    
    // Отправка запроса
    async emit_query() {
      if (this.fields.length * this.projects.length * this.issue_types.length == 0) {
        setTimeout(this.emit_query, 200);
        return;
      }

      if (this.value == undefined) return;

      // Пустой запрос - отправляем сразу (покажет все задачи)
      if (!this.value || this.value.trim() === '') {
      this.$emit("update_parent_from_input", this.value);
        this.$refs.issues_search_input?.blur();
        this.$emit("search_issues", '');
        this.$emit("converted", '');
        return;
      }

      // Валидируем запрос
      const validation = this.validate_query(this.value);
      
      if (!validation.valid) {
        // Невалидный запрос - пробуем GPT
        this.gpt_loader_visible = true;
        this.gpt_controller = new AbortController();
        const signal = this.gpt_controller.signal;

        try {
          let response = await rest.run_gpt('Найди задачи ' + this.value, 'find_issues', signal);
          this.gpt_loader_visible = false;

          if (!response.ok) {
            // GPT недоступен - показываем ошибку валидации
            const errorMsg = validation.errors?.map(e => e.message).join('\n') || 'Некорректный запрос';
            this.$store.commit('show_alert', {
              type: 'error',
              message: errorMsg
            });
            return;
          }

          const data = await response.json();

          if (data.humanGpt?.filter) {
            // GPT вернул фильтр - проверяем его
            this.value = data.humanGpt.filter;
            this.updateInputContent();
            
            // Повторно валидируем
            const revalidation = this.validate_query(this.value);
            if (!revalidation.valid) {
              // GPT вернул невалидный запрос
              const errorMsg = revalidation.errors?.map(e => e.message).join('\n') || 'GPT вернул некорректный запрос';
              this.$store.commit('show_alert', {
                type: 'error',
                message: errorMsg
              });
              return;
            }
            // GPT вернул валидный запрос - продолжаем отправку
          } else {
            // GPT не вернул фильтр - показываем исходную ошибку
            const errorMsg = validation.errors?.map(e => e.message).join('\n') || 'Не удалось распознать запрос';
            this.$store.commit('show_alert', {
              type: 'error',
              message: errorMsg
            });
            return;
          }
        } catch (err) {
          this.gpt_loader_visible = false;
          if (err.name === 'AbortError') {
            return; // Пользователь отменил
          }
          // GPT ошибка - показываем ошибку валидации
          console.error('GPT error:', err);
          const errorMsg = validation.errors?.map(e => e.message).join('\n') || 'Некорректный запрос';
          this.$store.commit('show_alert', {
            type: 'error',
            message: errorMsg
          });
          return;
        }
      }

      // Запрос валиден - отправляем
      this.$emit("update_parent_from_input", this.value);
      this.$refs.issues_search_input?.blur();
      
      // Кодируем запрос в base64
      const encoded_query = btoa(encodeURIComponent(this.value));
      this.$emit("search_issues", encoded_query);
      this.$emit("converted", encoded_query);
    },
    
    /**
     * Полная валидация запроса
     * Запрос валиден только если он полностью и корректно распарсен
     * 
     * Валидный запрос:
     * - Пустой запрос
     * - Полные выражения: Поле Оператор Значение [AND|OR Поле Оператор Значение]* [ORDER BY Поле [ASC|DESC]]*
     * 
     * Невалидный запрос:
     * - Незавершённый: "Изменена >" (нет значения)
     * - Неизвестные токены
     * - Ошибки типов значений
     */
    validate_query(query) {
      // Пустой запрос - валиден (покажет все задачи)
      if (!query || query.trim() === '') {
        return { valid: true };
      }
      
      // Полный парсинг с проверкой структуры
      return this.parseFullQuery(query.trim());
    },
    
    /**
     * Полный парсинг запроса с проверкой завершённости
     * Поддерживает скобки для группировки условий
     */
    parseFullQuery(query) {
      const tokens = this.tokenizeWithTypes(query);
      const errors = [];
      
      if (tokens.length === 0) {
        return { valid: false, errors: [{ message: 'Пустой запрос' }] };
      }
      
      // Состояния: 'expectField', 'expectOperator', 'expectValue', 'expectLogicOrEnd', 'expectOrderField', 'expectDirectionOrEnd'
      let state = 'expectField';
      let currentField = null;
      let isInOrderBy = false;
      let parenDepth = 0; // Глубина вложенности скобок
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Обработка скобок
        if (token.type === 'lparen') {
          // Открывающая скобка допустима когда ожидаем поле
          if (state === 'expectField') {
            parenDepth++;
            continue; // Остаёмся в состоянии expectField
          } else {
            return { valid: false, errors: [{ message: `Неожиданная открывающая скобка` }] };
          }
        }
        
        if (token.type === 'rparen') {
          // Закрывающая скобка допустима после значения или после закрывающей скобки
          if (state === 'expectLogicOrEnd' && parenDepth > 0) {
            parenDepth--;
            continue; // Остаёмся в состоянии expectLogicOrEnd
          } else if (parenDepth === 0) {
            return { valid: false, errors: [{ message: `Лишняя закрывающая скобка` }] };
          } else {
            return { valid: false, errors: [{ message: `Неожиданная закрывающая скобка` }] };
          }
        }
        
        switch (state) {
          case 'expectField':
            if (token.type === 'field') {
              currentField = this.all_fields.find(f => f.name.toLowerCase() === token.text.toLowerCase());
              state = 'expectOperator';
            } else if (token.type === 'logic' && token.text.toUpperCase().includes('ORDER')) {
              isInOrderBy = true;
              state = 'expectOrderField';
            } else {
              // Неизвестный токен - возможно свободный текст для GPT
              return { valid: false, errors: [{ message: `Ожидалось поле, получено: "${token.text}"` }] };
            }
            break;
            
          case 'expectOperator':
            if (token.type === 'operator') {
              state = 'expectValue';
            } else {
              return { valid: false, errors: [{ message: `Ожидался оператор (=, !=, <, >, like), получено: "${token.text}"` }] };
            }
            break;
            
          case 'expectValue':
            if (token.type === 'value' || token.type === 'string') {
              // Проверяем тип значения
              if (currentField) {
                let value = token.text;
                // Убираем кавычки
                if ((value.startsWith("'") && value.endsWith("'")) || 
                    (value.startsWith('"') && value.endsWith('"'))) {
                  value = value.slice(1, -1);
                }
                const typeError = this.validateValueType(currentField, value);
                if (typeError) {
                  errors.push(typeError);
                  return { valid: false, errors };
                }
              }
              state = 'expectLogicOrEnd';
            } else {
              return { valid: false, errors: [{ message: `Ожидалось значение после оператора, получено: "${token.text}"` }] };
            }
            break;
            
          case 'expectLogicOrEnd':
            if (token.type === 'logic') {
              const upper = token.text.toUpperCase();
              if (['AND', 'OR', 'И', 'ИЛИ'].includes(upper)) {
                state = 'expectField';
              } else if (upper.includes('ORDER')) {
                isInOrderBy = true;
                state = 'expectOrderField';
              } else if (['ASC', 'DESC'].includes(upper)) {
                // Направление без ORDER BY - ошибка
                return { valid: false, errors: [{ message: `Неожиданный токен: "${token.text}"` }] };
              } else {
                return { valid: false, errors: [{ message: `Неожиданный токен: "${token.text}"` }] };
              }
            } else {
              return { valid: false, errors: [{ message: `Ожидался AND, OR или ORDER BY, получено: "${token.text}"` }] };
            }
            break;
            
          case 'expectOrderField':
            if (token.type === 'field' || token.type === 'value' || token.type === 'unknown') {
              // В ORDER BY можно использовать любое поле
              state = 'expectDirectionOrEnd';
            } else {
              return { valid: false, errors: [{ message: `Ожидалось поле для сортировки, получено: "${token.text}"` }] };
            }
            break;
            
          case 'expectDirectionOrEnd':
            if (token.type === 'logic') {
              const upper = token.text.toUpperCase();
              if (['ASC', 'DESC'].includes(upper)) {
                state = 'expectCommaOrEnd';
              } else {
                return { valid: false, errors: [{ message: `Ожидалось ASC или DESC, получено: "${token.text}"` }] };
              }
            } else {
              return { valid: false, errors: [{ message: `Неожиданный токен после поля сортировки: "${token.text}"` }] };
            }
            break;
            
          case 'expectCommaOrEnd':
            // После направления можно только запятую для следующего поля сортировки
            return { valid: false, errors: [{ message: `Неожиданный токен: "${token.text}"` }] };
        }
      }
      
      // Проверяем незакрытые скобки
      if (parenDepth > 0) {
        return { valid: false, errors: [{ message: `Незакрытая скобка (не хватает ${parenDepth} закрывающих)` }] };
      }
      
      // Проверяем что запрос завершён
      if (state === 'expectOperator') {
        return { valid: false, errors: [{ message: 'Незавершённый запрос: ожидается оператор после поля' }] };
      }
      if (state === 'expectValue') {
        return { valid: false, errors: [{ message: 'Незавершённый запрос: ожидается значение после оператора' }] };
      }
      if (state === 'expectField') {
        return { valid: false, errors: [{ message: 'Незавершённый запрос: ожидается условие' }] };
      }
      if (state === 'expectOrderField') {
        return { valid: false, errors: [{ message: 'Незавершённый запрос: ожидается поле после ORDER BY' }] };
      }
      
      // Допустимые конечные состояния: expectLogicOrEnd, expectDirectionOrEnd, expectCommaOrEnd
      return { valid: true };
    },
    
    // Валидация типов полей
    validateFieldTypes(query) {
      const errors = [];
      
      // Паттерн для поиска сравнений: поле оператор значение
      const comparisonPattern = /([а-яА-ЯёЁa-zA-Z_][а-яА-ЯёЁa-zA-Z0-9_]*)\s*(=|!=|<|>|<=|>=|like)\s*('[^']*'|"[^"]*"|[^\s'"\)]+)/gi;
      
      let match;
      while ((match = comparisonPattern.exec(query)) !== null) {
        const [_, fieldName, operator, rawValue] = match;
        
        // Находим поле
        const field = this.all_fields.find(f => 
          f.name.toLowerCase() === fieldName.toLowerCase()
        );
        
        if (!field) continue; // Неизвестное поле - пропускаем (бэкенд обработает)
        
        // Убираем кавычки из значения
        let value = rawValue;
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        
        // Проверяем тип
        const typeError = this.validateValueType(field, value);
        if (typeError) {
          errors.push(typeError);
        }
      }
      
      if (errors.length > 0) {
        return { valid: false, errors };
      }
      
      return { valid: true };
    },
    
    // Валидация значения по типу поля
    validateValueType(field, value) {
      const fieldType = field.type;
      const fieldName = field.name;
      
      // NULL всегда допустим
      if (value.toLowerCase() === 'null') return null;
      
      // Специальные значения для Status
      if (fieldType === 'Status' && value.toLowerCase() === 'решенные') return null;
      
      switch (fieldType) {
        case 'Timestamp':
        case 'Date':
          // Проверяем формат даты
          const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;
          if (!dateRegex.test(value)) {
            // Проверяем, что это валидная дата
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              return {
                field: fieldName,
                message: `Недопустимое значение "${value}" для поля "${fieldName}". Ожидается дата в формате YYYY-MM-DD`,
                code: 'INVALID_DATE'
              };
            }
          }
          break;
          
        case 'Numeric':
        case 'Duration':
          if (isNaN(Number(value))) {
            return {
              field: fieldName,
              message: `Недопустимое значение "${value}" для поля "${fieldName}". Ожидается число`,
              code: 'INVALID_NUMBER'
            };
          }
          break;
          
        case 'Time':
          const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
          if (!timeRegex.test(value)) {
            return {
              field: fieldName,
              message: `Недопустимое значение "${value}" для поля "${fieldName}". Ожидается время в формате HH:MM`,
              code: 'INVALID_TIME'
            };
          }
          break;
          
        case 'Boolean':
          const boolValues = ['true', 'false', '1', '0', 'да', 'нет', 'yes', 'no'];
          if (!boolValues.includes(value.toLowerCase())) {
            return {
              field: fieldName,
              message: `Недопустимое значение "${value}" для поля "${fieldName}". Ожидается true/false или да/нет`,
              code: 'INVALID_BOOLEAN'
            };
          }
          break;
          
        // User, Project, Status, Type, Sprint, Tag, Select, String, Text - любое значение допустимо
      }
      
      return null;
    },
    
    // Определение текущего состояния ввода
    detect_state(query, cursorPos) {
      const beforeCursor = query.substring(0, cursorPos);
      const tokens = this.tokenizeWithTypes(beforeCursor);
      
      if (tokens.length === 0) {
        return { state: 'field', currentToken: '' };
      }
      
      // Находим последний оператор для контекста значений
      let lastOperator = null;
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].type === 'operator') {
          lastOperator = tokens[i].text;
          break;
        }
      }
      
      // Проверяем заканчивается ли на пробел или скобку (курсор после разделителя)
      const endsWithSpace = /\s$/.test(beforeCursor);
      const endsWithParen = /[()]$/.test(beforeCursor);
      
      const lastToken = tokens[tokens.length - 1];
      
      // Если заканчивается на пробел или скобку - смотрим на тип последнего токена
      if (endsWithSpace || endsWithParen) {
        if (lastToken.type === 'operator') {
          return { state: 'value', currentToken: '', fieldType: this.current_field_type, operator: lastToken.text };
        }
        if (lastToken.type === 'logic') {
          // После ORDER BY ожидаем поле
          if (lastToken.text.toUpperCase().includes('ORDER')) {
            return { state: 'order_field', currentToken: '' };
          }
          // После AND/OR ожидаем поле
          return { state: 'field', currentToken: '' };
        }
        if (lastToken.type === 'lparen') {
          // После открывающей скобки ожидаем поле
          return { state: 'field', currentToken: '' };
        }
        if (lastToken.type === 'rparen') {
          // После закрывающей скобки ожидаем логический оператор
          return { state: 'logic', currentToken: '' };
        }
        if (lastToken.type === 'field') {
          this.current_field_name = lastToken.text;
          this.current_field_type = this.get_field_type(lastToken.text);
          return { state: 'operator', currentToken: '', fieldType: this.current_field_type };
        }
        if (lastToken.type === 'value' || lastToken.type === 'string') {
          // После значения ожидаем логический оператор
          return { state: 'logic', currentToken: '' };
        }
        // Неизвестный токен - предлагаем поля
        return { state: 'field', currentToken: '' };
      }
      
      // Курсор внутри токена - частичный ввод
      const partialMatch = beforeCursor.match(/(\S+)$/);
      const partial = partialMatch ? partialMatch[1] : '';
      
      // Смотрим на предыдущий токен (до частичного)
      const prevTokens = this.tokenizeWithTypes(beforeCursor.substring(0, beforeCursor.length - partial.length));
      
      if (prevTokens.length > 0) {
        const prevLast = prevTokens[prevTokens.length - 1];
        
        if (prevLast.type === 'operator') {
          return { state: 'value', currentToken: partial, fieldType: this.current_field_type, operator: prevLast.text };
        }
        if (prevLast.type === 'logic') {
          if (prevLast.text.toUpperCase().includes('ORDER')) {
            return { state: 'order_field', currentToken: partial };
          }
          return { state: 'field', currentToken: partial };
        }
        if (prevLast.type === 'lparen') {
          // После открывающей скобки ожидаем поле
          return { state: 'field', currentToken: partial };
        }
        if (prevLast.type === 'field') {
          this.current_field_name = prevLast.text;
          this.current_field_type = this.get_field_type(prevLast.text);
          return { state: 'operator', currentToken: partial, fieldType: this.current_field_type };
        }
        if (prevLast.type === 'value' || prevLast.type === 'string') {
          return { state: 'logic', currentToken: partial };
        }
        if (prevLast.type === 'rparen') {
          return { state: 'logic', currentToken: partial };
        }
      }
      
      // По умолчанию - вводим поле
      return { state: 'field', currentToken: partial };
    },
    
    // Токенизация с типами для detect_state
    tokenizeWithTypes(str) {
      const tokens = [];
      let i = 0;
      let expectNext = 'field';
      
      while (i < str.length) {
        // Пробелы - пропускаем
        if (/\s/.test(str[i])) {
          while (i < str.length && /\s/.test(str[i])) i++;
          continue;
        }
        
        // Скобки
        if (str[i] === '(') {
          tokens.push({ type: 'lparen', text: '(' });
          i++;
          expectNext = 'field';
          continue;
        }
        if (str[i] === ')') {
          tokens.push({ type: 'rparen', text: ')' });
          i++;
          expectNext = 'logic';
          continue;
        }
        
        // Строка в кавычках
        if (str[i] === "'" || str[i] === '"') {
          const quote = str[i];
          let text = quote;
          i++;
          while (i < str.length && str[i] !== quote) {
            text += str[i];
            i++;
          }
          if (i < str.length) {
            text += str[i];
            i++;
          }
          tokens.push({ type: 'string', text });
          expectNext = 'logic';
          continue;
        }

        // Двухсимвольные операторы
        const twoChar = str.substring(i, i + 2);
        if (['!=', '<=', '>='].includes(twoChar)) {
          tokens.push({ type: 'operator', text: twoChar });
          i += 2;
          expectNext = 'value';
          continue;
        }

        // Однсимвольные операторы
        if (['=', '<', '>'].includes(str[i])) {
          tokens.push({ type: 'operator', text: str[i] });
          i++;
          expectNext = 'value';
          continue;
        }

        // Слово
        if (/[a-zA-Zа-яА-ЯёЁ0-9_-]/.test(str[i])) {
          let word = '';
          while (i < str.length && /[a-zA-Zа-яА-ЯёЁ0-9_-]/.test(str[i])) {
            word += str[i];
            i++;
          }
          
          const upperWord = word.toUpperCase();
          
          if (['AND', 'OR', 'И', 'ИЛИ', 'ASC', 'DESC'].includes(upperWord)) {
            tokens.push({ type: 'logic', text: word });
            expectNext = upperWord === 'ASC' || upperWord === 'DESC' ? 'logic' : 'field';
          } else if (upperWord === 'ORDER') {
            // ORDER BY
            let orderBy = word;
            let j = i;
            while (j < str.length && /\s/.test(str[j])) j++;
            if (str.substring(j, j + 2).toUpperCase() === 'BY') {
              orderBy += str.substring(i, j + 2);
              i = j + 2;
            }
            tokens.push({ type: 'logic', text: orderBy });
            expectNext = 'field';
          } else if (['LIKE', 'NOT'].includes(upperWord)) {
            tokens.push({ type: 'operator', text: word });
            expectNext = 'value';
          } else if (this.is_field(word)) {
            tokens.push({ type: 'field', text: word });
            this.current_field_name = word;
            this.current_field_type = this.get_field_type(word);
            expectNext = 'operator';
          } else if (expectNext === 'value') {
            tokens.push({ type: 'value', text: word });
            expectNext = 'logic';
          } else {
            tokens.push({ type: 'unknown', text: word });
          }
          continue;
        }

        i++;
      }
      
      return tokens;
    },
    
    // Простая токенизация
    tokenize(str) {
      const tokens = [];
      const regex = /'[^']*'|"[^"]*"|\S+/g;
      let match;
      while ((match = regex.exec(str)) !== null) {
        tokens.push(match[0]);
      }
      return tokens;
    },
    
    is_operator(token) {
      return ['=', '!=', '<', '>', '<=', '>=', 'like', 'LIKE'].includes(token);
    },
    
    is_logic_operator(token) {
      return ['AND', 'OR', 'and', 'or', 'И', 'ИЛИ'].includes(token);
    },
    
    is_field(token) {
      return this.all_fields.some(f => f.name.toLowerCase() === token.toLowerCase());
    },
    
    is_value(token) {
      // Строка в кавычках или идентификатор
      return token.startsWith("'") || token.startsWith('"') || 
             /^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/.test(token);
    },
    
    get_field_type(fieldName) {
      const field = this.all_fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
      if (field) {
        if (field.isCustom && field.available_values) {
          this.select_values = field.available_values;
        }
        return field.type;
      }
      return 'String';
    },
    
    // Генерация подсказок
    fill_suggestions(state, fieldType, currentToken, operator = null) {
      this.suggestions = [];
      
      switch (state) {
        case 'field':
        case 'order_field':
          // Предлагаем поля
          this.suggestions = this.all_fields.map(f => f.name);
          break;
          
        case 'operator':
          // Предлагаем операторы для типа поля
          const ops = this.types_to_operations[fieldType] || ['=', '!='];
          this.suggestions = [...ops];
          break;
          
        case 'value':
          // Генерируем умные подсказки в зависимости от типа и оператора
          this.suggestions = this.getValueSuggestions(fieldType, operator);
          break;
          
        case 'logic':
          // Предлагаем логические операторы
          this.suggestions = [...this.logic_operators];
          break;
      }
      
      // Фильтруем по текущему вводу
      if (currentToken) {
        const lowerToken = currentToken.toLowerCase();
        this.suggestions = this.suggestions.filter(s => 
          s.toLowerCase().startsWith(lowerToken)
        );
      }
      
      this.suggestions = this.suggestions.slice(0, 20);
    },
    
    // Умные подсказки для значений
    getValueSuggestions(fieldType, operator) {
      const suggestions = [];
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const isLike = operator && operator.toLowerCase() === 'like';
      const isEquals = operator === '=' || operator === '==';
      const isNotEquals = operator === '!=' || operator === '<>';
      
      // Специальные значения
      suggestions.push('NULL');
      
      switch (fieldType) {
        case 'Timestamp':
        case 'Date':
          // Для дат предлагаем сегодня и относительные даты
          suggestions.unshift(today);
          // Вчера
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          suggestions.push(yesterday.toISOString().split('T')[0]);
          // Неделю назад
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          suggestions.push(weekAgo.toISOString().split('T')[0]);
          // Месяц назад
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          suggestions.push(monthAgo.toISOString().split('T')[0]);
          break;
          
        case 'String':
        case 'Text':
        case 'Описание':
        case 'Название':
          if (isLike) {
            // Для LIKE предлагаем шаблоны с %
            suggestions.unshift("'%%'");
            suggestions.push("'%текст%'");
          } else {
            // Для = предлагаем пустые кавычки
            suggestions.unshift("''");
          }
          break;
          
        case 'Numeric':
        case 'Duration':
          suggestions.unshift('0');
          suggestions.push('1');
          suggestions.push('10');
          suggestions.push('100');
          break;
          
        case 'Boolean':
          suggestions.unshift('true');
          suggestions.push('false');
          suggestions.push('да');
          suggestions.push('нет');
          break;
          
        case 'Time':
          const now = new Date();
          const timeStr = now.toTimeString().substring(0, 5); // HH:MM
          suggestions.unshift(timeStr);
          suggestions.push('00:00');
          suggestions.push('12:00');
          suggestions.push('23:59');
          break;
          
        case 'User':
          // Значения из справочника пользователей
          if (this.vals_dict.User) {
            this.vals_dict.User.forEach(u => suggestions.push(u.name));
          }
          break;
          
        case 'Project':
          if (this.vals_dict.Project) {
            this.vals_dict.Project.forEach(p => suggestions.push(p.name));
          }
          break;
          
        case 'Status':
          suggestions.unshift('Решенные'); // Специальное значение
          if (this.vals_dict.Status) {
            this.vals_dict.Status.forEach(s => {
              if (s.name !== 'Решенные') suggestions.push(s.name);
            });
          }
          break;
          
        case 'Type':
          if (this.vals_dict.Type) {
            this.vals_dict.Type.forEach(t => suggestions.push(t.name));
          }
          break;
          
        case 'Sprint':
          if (this.vals_dict.Sprint) {
            this.vals_dict.Sprint.forEach(s => suggestions.push(s.name));
          }
          break;
          
        case 'Tag':
          if (isLike) {
            suggestions.unshift("'%%'");
          }
          if (this.vals_dict.Tag) {
            this.vals_dict.Tag.forEach(t => suggestions.push(t.name));
          }
          break;
          
        case 'Select':
          if (this.select_values && this.select_values.length > 0) {
            this.select_values.forEach(v => suggestions.push(v.name || v));
          }
          break;
          
        default:
          // Для неизвестных типов - базовые подсказки
          if (isLike) {
            suggestions.unshift("'%%'");
          } else {
            suggestions.unshift("''");
          }
      }
      
      return suggestions;
    },
    
    // Обработка ввода
    handleInput(e) {
      this.selected_suggestion_id = -1;
      this.value = e.target.innerText;
      this.position = this.getCaretIndex(e.target);
      
      const { state, currentToken, fieldType, operator } = this.detect_state(this.value, this.position);
      this.fill_suggestions(state, fieldType, currentToken, operator);
      
      // Применяем подсветку с небольшой задержкой чтобы не мешать вводу
      clearTimeout(this._highlightTimeout);
      this._highlightTimeout = setTimeout(() => {
        this.applyHighlighting();
      }, 100);
      
      this.emit_changes();
    },
    
    // Применение подсветки без сброса курсора
    applyHighlighting() {
      const input = this.$refs.issues_search_input;
      if (!input) return;
      
      const pos = this.getCaretIndex(input);
      const html = this.getHighlightedHtml();
      
      if (input.innerHTML !== html) {
        input.innerHTML = html;
        this.setCaretPosition(input, pos);
      }
    },
    
    // Использование подсказки
    use_suggestion(suggestion) {
      this.selected_suggestion_id = -1;
      
      const { state, currentToken } = this.detect_state(this.value, this.position);
      
      let insertText = suggestion;
      
      // Добавляем кавычки для значений со пробелами
      if (state === 'value' && suggestion.includes(' ')) {
        insertText = `'${suggestion}'`;
      }
      
      // Удаляем частично введённый токен и вставляем подсказку
      let beforeCursor = this.value.substring(0, this.position);
      let afterCursor = this.value.substring(this.position);
      
      if (currentToken) {
        beforeCursor = beforeCursor.substring(0, beforeCursor.length - currentToken.length);
      }
      
      // Добавляем пробел если нужно
      if (beforeCursor.length > 0 && !beforeCursor.endsWith(' ')) {
        insertText = ' ' + insertText;
      }
      insertText += ' ';
      
      this.value = beforeCursor + insertText + afterCursor;
      this.position = beforeCursor.length + insertText.length;
      
      // Обновляем input с подсветкой и ставим курсор
      const input = this.$refs.issues_search_input;
      if (input) {
        const html = this.getHighlightedHtml();
        input.innerHTML = html;
        input.focus();
        this.setCaretPosition(input, this.position);
      }
      
      nextTick(() => {
        const { state: newState, fieldType, operator } = this.detect_state(this.value, this.position);
        this.fill_suggestions(newState, fieldType, '', operator);
        this.emit_changes();
      });
    },
    
    // Навигация по подсказкам
    move_suggestion_select(incr) {
      const newId = this.selected_suggestion_id + incr;
      if (newId < 0 || newId >= this.suggestions.length) return;
      this.selected_suggestion_id = newId;
      
      // Скролл к выбранному элементу
      const el = this.$refs["suggestion" + newId]?.[0];
      const container = this.$refs.suggestion_area;
      if (el && container) {
        const minOffset = newId - this.suggestions_visible_count + 1;
        this.suggestions_offset = Math.max(minOffset, this.suggestions_offset);
        this.suggestions_offset = Math.min(newId, this.suggestions_offset);
        container.scrollTop = 29 * this.suggestions_offset;
      }
    },
    
    search_key_enter() {
      if (this.selected_suggestion_id >= 0 && this.suggestions[this.selected_suggestion_id]) {
        this.use_suggestion(this.suggestions[this.selected_suggestion_id]);
        } else {
        this.emit_query();
      }
    },
    
    focus(e) {
      this.$emit("input_focus", true);
      this.is_in_focus = true;
      if (this.value === '') {
        this.fill_suggestions('field', null, '');
      }
    },
    
    blur(e) {
      this.$emit("input_focus", false);
      setTimeout(() => { this.is_in_focus = false; }, 300);
    },
    
    emit_changes() {
      this.$emit("update_parent_from_input", this.value);
      if (this.parent_name) {
        this.$store.commit("id_push_update_" + this.parent_name, {
          id: this.id,
          val: this.value,
        });
      }
    },
    
    async stop_query() {
      this.gpt_controller?.abort();
    },
    
    getCaretIndex(element) {
      let position = 0;
      if (typeof window.getSelection !== "undefined") {
        const selection = window.getSelection();
        if (selection.rangeCount !== 0) {
          try {
            const range = window.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
          } catch (e) {}
        }
      }
      return position;
    },
    
    setCaretPosition(element, position) {
      if (!element) return;
      
      const range = document.createRange();
      const sel = window.getSelection();
      
      // Находим текстовый узел и позицию
      let currentPos = 0;
      let found = false;
      
      const walkNodes = (node) => {
        if (found) return;
        
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeLen = node.textContent.length;
          if (currentPos + nodeLen >= position) {
            range.setStart(node, position - currentPos);
            range.collapse(true);
            found = true;
          } else {
            currentPos += nodeLen;
          }
        } else {
          for (let child of node.childNodes) {
            walkNodes(child);
          }
        }
      };
      
      walkNodes(element);
      
      if (!found && element.childNodes.length > 0) {
        // Ставим в конец
        const lastNode = element.childNodes[element.childNodes.length - 1];
        if (lastNode.nodeType === Node.TEXT_NODE) {
          range.setStart(lastNode, lastNode.textContent.length);
        } else {
          range.setStartAfter(lastNode);
        }
        range.collapse(true);
      }
      
      sel.removeAllRanges();
      sel.addRange(range);
    },
    
    get_suggestions() {
      return this.suggestions;
    },
  },
};
</script>

<template>
  <div class="text">
    <div class="label">{{ label }}</div>
    <div class="issue-search-div">
      <div class="gpt-loader" v-show="gpt_loader_visible">
        Запрос обрабатывается искусственным интеллектом{{ gpt_pnts }}
      </div>
      <div v-show="!gpt_loader_visible"
        contenteditable="true"
        ref="issues_search_input"
        @focus="focus"
        @blur="blur"
        @input="handleInput"
        class="text-input issue-search-input"
        :disabled="disabled"
        @keyup.enter="search_key_enter"
        @keydown.enter.prevent
        @keydown.down.prevent
        @keydown.up.prevent
        @keydown.down="move_suggestion_select(1)"
        @keydown.up="move_suggestion_select(-1)"
        @keydown.esc="suggestions = []"
      ></div>
      
      <KButton
        name="bx-search-alt-2"
        class="issue-search-input-btn"
        @click="emit_query"
        v-show="!disabled && !gpt_loader_visible"
      />
      <KButton
        name="bx-stop-circle"
        class="issue-stop-search-input-btn"
        @click="stop_query"
        v-show="!disabled && gpt_loader_visible"
      />
    </div>
    <div
      ref="suggestion_area"
      class="suggestion-area"
      v-show="is_in_focus && suggestions.length > 0"
    >
      <span
        v-for="(suggestion, index) in get_suggestions()"
        :key="index"
        :ref="'suggestion' + index"
        @mousedown.prevent
        @click="use_suggestion(suggestion)"
        :class="{ 'selected-suggestion': Number(index) == selected_suggestion_id }"
      >
        {{ suggestion }}
      </span>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

// Подсветка синтаксиса
.hl-field {
  color: #569cd6; // синий - поля
  font-weight: 500;
}
.hl-operator {
  color: #d4d4d4; // светло-серый - операторы
  font-weight: bold;
}
.hl-value {
  color: #ce9178; // оранжевый - значения
}
.hl-string {
  color: #ce9178; // оранжевый - строки в кавычках
}
.hl-logic {
  color: #c586c0; // розовый - AND, OR, ORDER BY
  font-weight: bold;
}
.hl-paren {
  color: #ffd700; // золотой - скобки
  font-weight: bold;
}
.hl-error {
  color: #f44747; // красный - ошибки
  text-decoration: wavy underline;
  text-decoration-color: #f44747;
}
.hl-text {
  color: var(--text-color);
}
.hl-unknown {
  color: #808080; // серый - неизвестное
}

.issue-search-div .text-input {
  white-space: nowrap;
  overflow: auto;
  display: inline-block;
  padding: 5px !important;
  margin-right: 30px !important;
}

.text .text-input {
  width: 100%;
  height: $input-height;
  min-height: $input-height;
  color: var(--text-color);
  padding: 0 10px 0 10px;
  resize: none;
}

.text-input {
  font-size: 14px;
  transition: all 0.5s ease;
  background: var(--input-bg-color);
  width: 100%;
  border-color: var(--border-color);
  border-style: var(--border-style);
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

.issue-search-input {
  width: 50vw !important;
}

.suggestion-area {
  font-size: 12px;
  font-weight: 300;
  transition: all 0.5s ease;
  background: var(--disabled-bg-color);
  border-color: var(--border-color);
  border-style: groove;
  border-width: var(--border-width);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  height: calc(29px * 8 + 2px);
  overflow: auto;
  width: 300px;
  position: fixed;
  z-index: 10;
}

.suggestion-area::-webkit-scrollbar {
  display: none;
}

.suggestion-area span {
  cursor: pointer;
  font-size: 15px;
  font-weight: 300;
  padding: 4px;
  margin-left: 10px;
  margin-right: 10px;
  padding-left: 10px;
  height: 28px;
  min-height: 28px;
}

.selected-suggestion {
  background: var(--table-row-color-selected);
}

.text-input:disabled {
  background: var(--disabled-bg-color);
  color: var(--disabled-text-color);
}

.text-input::-webkit-scrollbar {
  display: none;
}

.issue-search-div {
  display: flex;
}

.gpt-loader {
  width: 50vw;
  height: $input-height;
  background: var(--disabled-bg-color);
  padding: 5px;
  border-color: var(--border-color);
  border-style: groove;
  border-width: var(--border-width);
  border-radius: var(--border-radius);
}

.issue-search-input-btn {
  padding: 0px;
}

.issue-search-input-btn .btn_input,
.issue-stop-search-input-btn .btn_input {
  padding: 0px;
  border-top-left-radius: 0px !important;
  border-bottom-left-radius: 0px !important;
  margin-left: -$input-height;
  width: $input-height !important;
  height: $input-height;
  border-top-width: var(--issue-search-btn-top-border-width) !important;
  border-bottom-width: var(--border-width) !important;
  border-left-color: var(--border-color) !important;
  border-top-color: var(--border-color) !important;
}
</style>
