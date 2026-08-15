import { TestBed } from '@angular/core/testing';

import { WindService } from './wind-service';

describe('WindService', () => {
  let service: WindService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WindService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should track plants as state', () => {
    const before = service.count();
    service.add({ id: 'test', name: 'Test', powerKw: 1 });
    expect(service.count()).toBe(before + 1);

    service.remove('test');
    expect(service.count()).toBe(before);
  });
});
